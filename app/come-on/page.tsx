'use client'

// Come on（対面）：「いま近くで会える人」の一覧 → 相手を選ぶ → 希望時間を選ぶ → 地図付きチャットへ。
// 以前は Come on ボタンから固定の相手チャットへ直行していたが、実際には
// 「今行ける人」は時々刻々変わるため、まず一覧を出して選ぶ形にする。
//
// 実データ：GPS を取って match-nearby（3km以内 × Daisy×Seed 類似度）を叩く。
// 取得0件・位置不許可・通信失敗のときは、動作確認用のモック一覧にフォールバックする。

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserAvatar } from '@/src/components/UserAvatar'
import { ensureThread } from '@/src/lib/mockChat'

const EDGE_FUNCTIONS_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const EDGE_FUNCTION_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
}

type NearbyPerson = {
  userId: string
  username: string
  avatar_url: string | null
  tag: string
  distanceKm: number
  lat?: number
  lng?: number
}

// match-nearby のレスポンス1件（距離はメートル・スコア降順で並んで返る）
type NearbyMatch = {
  userId: string
  username: string
  avatar_url: string | null
  distanceMeters: number
  latitude: number
  longitude: number
  commonTags: string[]
}

// ── 動作確認用モック（今行ける人）─────────────────────────────────────────
// 実データが取れないとき（位置不許可・0件・通信失敗）に表示する。距離順に並べておく。
const COMEON_MOCKS: NearbyPerson[] = [
  { userId: 'mock-comeon-a', username: 'ゆい',   avatar_url: null, tag: '将来が不安',   distanceKm: 0.8, lat: 35.7354, lng: 139.4063 },
  { userId: 'mock-comeon-b', username: 'はると', avatar_url: null, tag: '仕事の悩み',   distanceKm: 1.2, lat: 35.7360, lng: 139.4055 },
  { userId: 'mock-comeon-c', username: 'みお',   avatar_url: null, tag: '人間関係の疲れ', distanceKm: 2.3, lat: 35.7342, lng: 139.4081 },
]

const COMEON_DURATIONS: { minutes: number; label: string }[] = [
  { minutes: 30, label: '30分' },
  { minutes: 60, label: '1時間' },
  { minutes: 90, label: '1時間30分' },
]

// navigator.geolocation を Promise 化（数秒で諦めてモックに倒す）
function getPosition(timeoutMs = 4000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    )
  })
}

export default function ComeOnPage() {
  const router = useRouter()
  const [people, setPeople] = useState<NearbyPerson[] | null>(null)
  // 相手を選んだあとの希望時間モーダル（null なら一覧）
  const [selected, setSelected] = useState<NearbyPerson | null>(null)
  const [minutes, setMinutes] = useState(30)

  // 近くで会える人を取得（実データ → だめならモック）
  useEffect(() => {
    const uid = localStorage.getItem('user_id')
    if (!uid) { setPeople(COMEON_MOCKS); return }
    ;(async () => {
      try {
        const pos = await getPosition()
        if (!pos) { setPeople(COMEON_MOCKS); return }
        const res = await fetch(`${EDGE_FUNCTIONS_BASE}/match-nearby`, {
          method: 'POST',
          headers: EDGE_FUNCTION_HEADERS,
          body: JSON.stringify({ user_id: uid, lat: pos.lat, lng: pos.lng, mode: 'help' }),
        })
        const data = await res.json().catch(() => ({}))
        const matches = (data?.matches as NearbyMatch[]) ?? []
        if (matches.length === 0) { setPeople(COMEON_MOCKS); return }
        setPeople(matches.map((m) => ({
          userId: m.userId,
          username: m.username,
          avatar_url: m.avatar_url,
          tag: m.commonTags[0] ?? '',
          distanceKm: Math.round((m.distanceMeters / 1000) * 10) / 10,
          lat: m.latitude,
          lng: m.longitude,
        })))
      } catch {
        setPeople(COMEON_MOCKS)
      }
    })()
  }, [])

  // 希望時間を選んで、その相手との地図付きチャット（?type=comeon）へ
  const connect = (p: NearbyPerson, mins: number) => {
    ensureThread({ friendId: p.userId, name: p.username, tag: p.tag })
    const q = new URLSearchParams({
      friendId: p.userId,
      name: p.username,
      tag: p.tag,
      want: 'meet',
      type: 'comeon',
      minutes: String(mins),
      dist: `${p.distanceKm}km`,
      ...(p.lat != null ? { lat: String(p.lat) } : {}),
      ...(p.lng != null ? { lng: String(p.lng) } : {}),
    }).toString()
    router.push(`/home/chat?${q}`)
  }

  return (
    <div className="md:max-w-4xl! md:h-[calc(100svh-56px)]!" style={{
      background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
      height: '100svh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* ── ヘッダー（戻る・iOSセーフエリア） ── */}
      <div style={{
        padding: 'calc(12px + env(safe-area-inset-top)) 20px 12px', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid rgba(139,115,85,0.15)',
      }}>
        <button
          onClick={() => (selected ? setSelected(null) : router.back())}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, color: '#3B2F1E', padding: 0, flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
          }}
        >
          ← 戻る
        </button>
        <span style={{
          fontSize: 15, fontWeight: 700, color: '#3B2F1E',
          flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {selected ? '会う時間を選ぶ' : 'Come on'}
        </span>
      </div>

      {selected ? (
        /* ── 希望時間の選択（相手を選んだあと） ── */
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '32px 20px calc(24px + env(safe-area-inset-bottom))',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <UserAvatar username={selected.username} avatarUrl={selected.avatar_url} size={72} />
          <span style={{ fontSize: 18, fontWeight: 700, color: '#3B2F1E', margin: '14px 0 6px' }}>
            {selected.username}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#FBE4DE', color: '#C0392B',
            borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700,
          }}>
            📍 {selected.distanceKm}km先
          </span>

          <p style={{ fontSize: 14, color: 'rgba(59,47,30,0.7)', margin: '28px 0 16px', textAlign: 'center' }}>
            どのくらいの時間、<br />会って話したいか選んでください。
          </p>

          <div style={{ width: '100%', maxWidth: 320, display: 'flex', gap: 8, marginBottom: 20 }}>
            {COMEON_DURATIONS.map(o => {
              const on = minutes === o.minutes
              return (
                <button
                  key={o.minutes}
                  onClick={() => setMinutes(o.minutes)}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 14, cursor: 'pointer',
                    background: on ? '#FBE4DE' : '#FFFFFF',
                    border: on ? '2px solid #C0392B' : '1px solid rgba(139,115,85,0.3)',
                    color: on ? '#C0392B' : '#5C3A1E', fontSize: 14, fontWeight: 700,
                  }}
                >
                  {o.label}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => connect(selected, minutes)}
            style={{
              width: '100%', maxWidth: 320, padding: '14px 0', borderRadius: 24, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #E8654F 0%, #C0392B 100%)',
              color: '#FFFFFF', fontSize: 15, fontWeight: 700,
            }}
          >
            この時間できて欲しい
          </button>
        </div>
      ) : (
        /* ── 一覧（いま近くで会える人・距離順） ── */
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px calc(24px + env(safe-area-inset-bottom))' }}>
          <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.6)', margin: '0 0 14px', textAlign: 'center', lineHeight: 1.7 }}>
            いま近くにいて、直接会って話せる人です。<br />相手を選ぶと、会う時間を決めてつながれます。
          </p>

          {people === null ? (
            <p style={{ textAlign: 'center', paddingTop: 40, fontSize: 13, color: 'rgba(59,47,30,0.45)' }}>
              近くの人を探しています...
            </p>
          ) : people.length === 0 ? (
            <p style={{ textAlign: 'center', paddingTop: 40, fontSize: 13, color: 'rgba(59,47,30,0.45)' }}>
              いまは近くに会える人がいません。<br />時間をおいて、もう一度ためしてください。
            </p>
          ) : (
            <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:grid-cols-3 md:items-start">
              {people.map(p => (
                <div
                  key={p.userId}
                  style={{
                    width: '100%', background: '#FFFFFF', borderRadius: 16,
                    border: '1px solid rgba(139,115,85,0.15)',
                    boxShadow: '0 1px 4px rgba(59,47,30,0.05)',
                    padding: '14px 16px',
                    display: 'flex', flexDirection: 'column', gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <UserAvatar username={p.username} avatarUrl={p.avatar_url} size={48} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#3B2F1E', marginBottom: 5 }}>
                        {p.username}
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: '#FBE4DE', color: '#C0392B',
                          borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700,
                        }}>
                          📍 {p.distanceKm}km先
                        </span>
                        {p.tag && (
                          <span style={{
                            display: 'inline-block',
                            background: '#E4EFE0', color: '#3B6D11',
                            borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 600,
                          }}>
                            #{p.tag}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => { setMinutes(30); setSelected(p) }}
                    style={{
                      width: '100%', padding: '12px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg, #E8654F 0%, #C0392B 100%)',
                      color: '#FFFFFF', fontSize: 15, fontWeight: 700,
                    }}
                  >
                    きて欲しい
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
