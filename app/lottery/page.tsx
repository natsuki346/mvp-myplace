'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleMap, useJsApiLoader, Marker, OverlayView } from '@react-google-maps/api'
import { supabase } from '@/src/lib/supabase/client'
import { BottomNav } from '@/src/components/BottomNav'
import { FireMarker } from '@/src/components/FireMarker'
import { MatchModal } from '@/src/components/MatchModal'

// 半径3km・鮮度24時間・対面対応（meet/both）のフィルタは match-nearby Edge Function 側
// （service role）で行う。
// user_locations は RLS で anon から読めないため、クライアントは直接触らない。
const JITTER_METERS = 30
const METERS_PER_LAT = 111_000
// BottomNavの高さ（固定）
const BOTTOM_NAV_H = 72

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

const EDGE_FUNCTIONS_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const EDGE_FUNCTION_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
}

function normalizeTag(text: string): string {
  return text.replace(/^#+/, '')
}

function jitterPosition(lat: number, lng: number): { lat: number; lng: number } {
  const metersPerLng = METERS_PER_LAT * Math.cos((lat * Math.PI) / 180)
  const dLat = ((Math.random() * 2 - 1) * JITTER_METERS) / METERS_PER_LAT
  const dLng = ((Math.random() * 2 - 1) * JITTER_METERS) / metersPerLng
  return { lat: lat + dLat, lng: lng + dLng }
}

type Match = {
  userId: string
  username: string
  distanceMeters: number
  commonTags: string[]
  jitteredPos: { lat: number; lng: number }
}

type PageState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'searching'; lat: number; lng: number }
  | { status: 'done'; lat: number; lng: number; matches: Match[] }
  | { status: 'error'; message: string }

type NearbyMatch = {
  userId: string
  username: string
  distanceMeters: number
  latitude: number
  longitude: number
  commonTags: string[]
}

// 位置の保存＋2km以内・24時間以内・経験/悩みマッチをサーバー側でまとめて行う
async function findNearbyMatches(
  myUserId: string,
  myLat: number,
  myLng: number,
): Promise<Match[]> {
  try {
    const res = await fetch(`${EDGE_FUNCTIONS_BASE}/match-nearby`, {
      method: 'POST',
      headers: EDGE_FUNCTION_HEADERS,
      body: JSON.stringify({ user_id: myUserId, lat: myLat, lng: myLng }),
    })
    if (!res.ok) return []
    const data = await res.json().catch(() => ({}))
    return (((data?.matches ?? []) as NearbyMatch[])).map(m => ({
      userId: m.userId,
      username: m.username,
      distanceMeters: m.distanceMeters,
      commonTags: m.commonTags,
      jitteredPos: jitterPosition(m.latitude, m.longitude),
    }))
  } catch {
    return []
  }
}

// ── 通知ヘルパー ──────────────────────────────────────────────────────────────

async function requestNotificationPermission() {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      await LocalNotifications.requestPermissions()
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  } catch {
    // 通知が使えない環境は無視
  }
}

async function fireMatchNotification() {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      await LocalNotifications.schedule({
        notifications: [{
          title: 'マッチしました🔥',
          body: '近くに共通タグを持つ人がいます。チャットしてみましょう！',
          id: 1,
        }],
      })
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('マッチしました🔥', {
          body: '近くに共通タグを持つ人がいます。チャットしてみましょう！',
        })
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission()
        if (perm === 'granted') {
          new Notification('マッチしました🔥', {
            body: '近くに共通タグを持つ人がいます。チャットしてみましょう！',
          })
        }
      }
    }
  } catch {
    // 通知が使えない環境は無視
  }
}

// ── 地図コンポーネント ────────────────────────────────────────────────────────

type MapProps = {
  myPos: { lat: number; lng: number }
  matches: Match[]
  // マッチ相手とチャット（会う約束）を始める
  onMatchChat: (m: Match, tag: string) => void
}

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'greedy',
  keyboardShortcuts: false,
}

// 親コンテナが高さを持つので 100% で追従させる
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }

function LotteryMap({ myPos, matches, onMatchChat }: MapProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: MAPS_API_KEY })

  const onMapClick = useCallback(() => setActiveIndex(null), [])

  if (!isLoaded) {
    return (
      <div style={{
        width: '100%', height: '100%',
        background: 'rgba(59,47,30,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, color: 'rgba(59,47,30,0.4)',
      }}>
        地図を読み込み中...
      </div>
    )
  }

  return (
    <>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={myPos}
        zoom={13}
        options={MAP_OPTIONS}
        onClick={onMapClick}
      >
        {/* 自分の位置：青いマーカー */}
        <Marker
          position={myPos}
          title="現在地"
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          }}
        />

        {/* マッチしたユーザー：SVG炎アニメーションマーカー（jitter済み位置） */}
        {matches.map((match, i) => (
          <OverlayView
            key={i}
            position={match.jitteredPos}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h })}
          >
            <FireMarker
              size={64}
              onClick={() => setActiveIndex(i === activeIndex ? null : i)}
            />
          </OverlayView>
        ))}
      </GoogleMap>

      <MatchModal
        match={activeIndex !== null ? matches[activeIndex] : null}
        onClose={() => setActiveIndex(null)}
        onTagClick={(tag) => {
          if (activeIndex !== null) onMatchChat(matches[activeIndex], tag)
        }}
      />
    </>
  )
}

// ── ページ本体 ────────────────────────────────────────────────────────────────

export default function LotteryPage() {
  const router = useRouter()
  const [state, setState] = useState<PageState>({ status: 'idle' })
  const prevMatchCountRef = useRef(0)

  // 会う約束/チャット：accepted な connection を用意してフレンドチャットへ（対面プリセット付き）
  const startMeetChat = useCallback(async (m: Match, tag: string) => {
    const uid = localStorage.getItem('user_id')
    if (!uid || !m.userId) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from('connections') as any)
      .select('id')
      .or(`and(requester_id.eq.${uid},receiver_id.eq.${m.userId}),and(requester_id.eq.${m.userId},receiver_id.eq.${uid})`)
    if (!existing || existing.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('connections') as any)
        .insert({ requester_id: uid, receiver_id: m.userId, status: 'accepted' })
    }

    const q = new URLSearchParams({
      friendId: m.userId,
      name: m.username,
      tag: normalizeTag(tag),
      want: 'meet',
      preset: 'こんにちは。どこで会いますか？',
    }).toString()
    router.push(`/room/friend/chat?${q}`)
  }, [router])

  // 通知許可リクエスト（マウント時1回）
  useEffect(() => {
    requestNotificationPermission()
  }, [])

  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    if (!userId) {
      setState({ status: 'error', message: 'ログインが必要です' })
      return
    }
    if (!navigator.geolocation) {
      setState({ status: 'error', message: 'このブラウザは位置情報に対応していません' })
      return
    }

    setState({ status: 'loading' })

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude

        // 位置の保存は match-nearby Edge Function 内で行う（anonからの直接書き込みはしない）
        setState({ status: 'searching', lat, lng })
        const matches = await findNearbyMatches(userId, lat, lng)
        setState({ status: 'done', lat, lng, matches })

        // 0→1以上に増えた瞬間だけ通知
        if (prevMatchCountRef.current === 0 && matches.length > 0) {
          fireMatchNotification().catch(() => {})
        }
        prevMatchCountRef.current = matches.length
      },
      (err) => {
        let message = '位置情報を取得できませんでした'
        if (err.code === err.PERMISSION_DENIED) {
          message = '位置情報の使用が拒否されています。端末の設定からブラウザへの位置情報アクセスを許可してください'
        } else if (err.code === err.TIMEOUT) {
          message = '位置情報の取得がタイムアウトしました。再度お試しください'
        }
        setState({ status: 'error', message })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }, [])

  const hasMapsKey = MAPS_API_KEY.length > 0

  return (
    <div style={{
      position: 'relative',
      maxWidth: 390, margin: '0 auto',
      height: '100svh', overflow: 'hidden',
      background: '#F5F0E8',
    }}>

      {/* ── 全画面地図（done状態のみ） ── */}
      {state.status === 'done' && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          bottom: BOTTOM_NAV_H,
        }}>
          {hasMapsKey ? (
            <LotteryMap
              myPos={{ lat: state.lat, lng: state.lng }}
              matches={state.matches}
              onMatchChat={startMeetChat}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: 'rgba(59,47,30,0.4)',
            }}>
              🗺️ 地図機能を準備中です
            </div>
          )}
        </div>
      )}

      {/* ── ローディング・エラー（地図なし状態）── */}
      {state.status !== 'done' && (
        <div style={{
          height: `calc(100svh - ${BOTTOM_NAV_H}px)`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '0 24px',
        }}>
          {(state.status === 'loading') && (
            <p style={{ textAlign: 'center', color: 'rgba(59,47,30,0.5)', fontSize: 14 }}>
              現在地を取得中...
            </p>
          )}
          {state.status === 'searching' && (
            <p style={{ textAlign: 'center', color: 'rgba(59,47,30,0.5)', fontSize: 14 }}>
              近くの人を探しています...
            </p>
          )}
          {state.status === 'error' && (
            <div style={{
              background: '#FFFFFF', borderRadius: 16, padding: '24px 20px',
              textAlign: 'center', border: '1px solid rgba(212,184,150,0.5)',
              width: '100%',
            }}>
              <p style={{ fontSize: 28, margin: '0 0 8px' }}>📵</p>
              <p style={{ fontSize: 14, color: '#3B2F1E', margin: 0, lineHeight: 1.6 }}>
                {state.message}
              </p>
            </div>
          )}
        </div>
      )}

      {/*
        ── マッチカード（非表示・後ステップで再設計）────────────────────────
        {state.status === 'done' && state.matches.map((match, i) => (
          <div key={i}>
            <span>約{match.distanceMeters}m</span>
            {match.commonTags.map(tag => (
              <button key={tag} onClick={() => router.push(`/lottery/room?tag=${encodeURIComponent(tag)}`)}>
                #{normalizeTag(tag)} 入室 ›
              </button>
            ))}
          </div>
        ))}
        ─────────────────────────────────────────────────────────────────── */}

      <BottomNav />
    </div>
  )
}
