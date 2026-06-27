'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { supabase } from '@/src/lib/supabase/client'
import { getDistanceMeters } from '@/src/lib/geo'
import { BottomNav } from '@/src/components/BottomNav'

const RADIUS_METERS = 100
const JITTER_METERS = 30
const METERS_PER_LAT = 111_000
// BottomNavの高さ（固定）
const BOTTOM_NAV_H = 72

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

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

async function findNearbyMatches(
  myUserId: string,
  myLat: number,
  myLng: number,
): Promise<Match[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: locations, error: locError } = await (supabase.from('user_locations') as any)
    .select('user_id, latitude, longitude')
    .neq('user_id', myUserId)

  if (locError || !locations) return []

  const nearby = (locations as { user_id: string; latitude: number; longitude: number }[])
    .map(row => ({
      userId: row.user_id,
      lat: row.latitude,
      lng: row.longitude,
      distanceMeters: Math.round(getDistanceMeters(myLat, myLng, row.latitude, row.longitude)),
    }))
    .filter(u => u.distanceMeters <= RADIUS_METERS)

  if (nearby.length === 0) return []

  const nearbyIds = nearby.map(u => u.userId)

  const [myTagsRes, theirTagsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('tags') as any)
      .select('text')
      .eq('user_id', myUserId)
      .eq('is_active', true),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('tags') as any)
      .select('user_id, text')
      .in('user_id', nearbyIds)
      .eq('is_active', true),
  ])

  const myTexts = new Map<string, string>(
    ((myTagsRes.data ?? []) as { text: string }[]).map(t => [normalizeTag(t.text), t.text]),
  )

  const tagsByUser = new Map<string, Set<string>>()
  for (const row of (theirTagsRes.data ?? []) as { user_id: string; text: string }[]) {
    if (!tagsByUser.has(row.user_id)) tagsByUser.set(row.user_id, new Set())
    tagsByUser.get(row.user_id)!.add(normalizeTag(row.text))
  }

  const matches: Match[] = []
  for (const u of nearby) {
    const theirNormalized = tagsByUser.get(u.userId) ?? new Set<string>()
    const common = [...myTexts.entries()]
      .filter(([normalized]) => theirNormalized.has(normalized))
      .map(([, original]) => original)
    if (common.length > 0) {
      matches.push({
        distanceMeters: u.distanceMeters,
        commonTags: common,
        jitteredPos: jitterPosition(u.lat, u.lng),
      })
    }
  }

  return matches.sort((a, b) => a.distanceMeters - b.distanceMeters)
}

// ── 地図コンポーネント ────────────────────────────────────────────────────────

type MapProps = {
  myPos: { lat: number; lng: number }
  matches: Match[]
  onTagClick: (tag: string) => void
}

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'greedy',
}

// 親コンテナが高さを持つので 100% で追従させる
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }

function LotteryMap({ myPos, matches, onTagClick }: MapProps) {
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
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={myPos}
      zoom={17}
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

      {/* マッチしたユーザー：🔥絵文字マーカー（jitter済み位置） */}
      {matches.map((match, i) => (
        <Marker
          key={i}
          position={match.jitteredPos}
          title={`マッチ ${i + 1}`}
          label={{ text: '🔥', fontSize: '22px' }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 0,
            fillOpacity: 0,
            strokeOpacity: 0,
          }}
          onClick={() => setActiveIndex(i === activeIndex ? null : i)}
        />
      ))}

      {/* InfoWindow */}
      {activeIndex !== null && matches[activeIndex] && (
        <InfoWindow
          position={matches[activeIndex].jitteredPos}
          onCloseClick={() => setActiveIndex(null)}
        >
          <div style={{ fontFamily: 'sans-serif', fontSize: 13, minWidth: 160, maxWidth: 200 }}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#3B2F1E' }}>
              🤝 共通タグ
            </p>
            {matches[activeIndex].commonTags.map(tag => (
              <div key={tag} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 6, marginBottom: 6,
              }}>
                <span style={{
                  background: '#F5D78E', borderRadius: 12, padding: '2px 8px',
                  fontSize: 11, color: '#7A5C00', fontWeight: 600, flexShrink: 0,
                }}>
                  #{normalizeTag(tag)}
                </span>
                <button
                  onClick={() => onTagClick(tag)}
                  style={{
                    background: '#4A7C59', color: '#F5F0E8',
                    border: 'none', borderRadius: 10, padding: '3px 8px',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  チャット ›
                </button>
              </div>
            ))}
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(59,47,30,0.5)' }}>
              約{matches[activeIndex].distanceMeters}m
            </p>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  )
}

// ── ページ本体 ────────────────────────────────────────────────────────────────

export default function LotteryPage() {
  const router = useRouter()
  const [state, setState] = useState<PageState>({ status: 'idle' })

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: upsertError } = await (supabase.from('user_locations') as any).upsert(
          { user_id: userId, latitude: lat, longitude: lng, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        )
        if (upsertError) {
          console.error('user_locations upsert error:', upsertError.message)
          setState({ status: 'error', message: '位置情報の保存に失敗しました' })
          return
        }

        setState({ status: 'searching', lat, lng })
        const matches = await findNearbyMatches(userId, lat, lng)
        setState({ status: 'done', lat, lng, matches })
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
              onTagClick={(tag) => router.push(`/lottery/room?tag=${encodeURIComponent(tag)}`)}
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
