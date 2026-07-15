'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserAvatar } from '@/src/components/UserAvatar'
import {
  fetchBookings, fmtDate, fmtTime, isNew, METHOD_META, type Booking,
} from './api'

const GOLD = '#C9A84C'
const CARD_BG = '#FBF7EE'
const CARD_BORDER = '#E0D5BE'
const SEGMENT_BG = '#EDE5D0'

type SegTab = 'upcoming' | 'history'

// ユーザー（話を聞いてほしい側）向け：自分の予約の予定・履歴
export default function UserBookingView({ userId }: { userId: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<SegTab>('upcoming')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchBookings(userId)
      .then(setBookings)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) {
    return <p style={{ textAlign: 'center', paddingTop: 48, fontSize: 13, color: 'rgba(59,47,30,0.4)' }}>読み込み中...</p>
  }
  if (error) {
    return <p style={{ textAlign: 'center', paddingTop: 48, fontSize: 13, color: 'rgba(59,47,30,0.5)' }}>データを取得できませんでした</p>
  }

  const upcoming = bookings
    .filter(b => b.status === 'pending' || b.status === 'confirmed')
    .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`))
  const history = bookings
    .filter(b => b.status === 'completed' || b.status === 'cancelled')
    .sort((a, b) => `${b.date}${b.start_time}`.localeCompare(`${a.date}${a.start_time}`))

  const list = tab === 'upcoming' ? upcoming : history
  // 直近の予約（最も近い日時）をハイライト
  const nearestId = upcoming[0]?.id ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* セグメントタブ */}
      <div style={{
        display: 'flex', background: SEGMENT_BG, borderRadius: 12, padding: 3,
        margin: '0 0 16px', flexShrink: 0,
      }}>
        {([
          { key: 'upcoming' as SegTab, label: '予定' },
          { key: 'history' as SegTab, label: '履歴' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: tab === t.key ? '#FFFFFF' : 'transparent',
              color: tab === t.key ? '#3B2F1E' : 'rgba(59,47,30,0.45)',
              fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
              boxShadow: tab === t.key ? '0 1px 3px rgba(59,47,30,0.1)' : 'none',
              transition: 'background 0.15s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 一覧 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {list.length === 0 ? (
          <p style={{ textAlign: 'center', paddingTop: 40, fontSize: 13, color: 'rgba(59,47,30,0.45)' }}>
            {tab === 'upcoming' ? 'まだ予約はありません' : '履歴はありません'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
            {list.map(b => {
              const other = b.host
              const tag = b.host_tag
              const mm = METHOD_META[b.method]
              const highlight = tab === 'upcoming' && b.id === nearestId
              const cancelled = b.status === 'cancelled'
              return (
                <div key={b.id} style={{
                  background: CARD_BG,
                  border: highlight ? `2px solid ${GOLD}` : `1px solid ${CARD_BORDER}`,
                  borderRadius: 14, padding: '12px 14px',
                  opacity: cancelled ? 0.6 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <UserAvatar username={other?.username} avatarUrl={other?.avatar_url ?? null} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E' }}>
                          {other?.username ?? '不明'}
                        </span>
                        {tag && (
                          <span style={{
                            background: '#F5E1A8', color: '#7A5C00',
                            borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 600,
                          }}>#{tag.replace(/^#+/, '')}</span>
                        )}
                        {tab === 'upcoming' && isNew(b.created_at) && (
                          <span style={{
                            background: '#C0392B', color: '#FFFFFF',
                            borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700,
                          }}>新着</span>
                        )}
                        {cancelled && (
                          <span style={{
                            background: 'rgba(139,115,85,0.25)', color: 'rgba(59,47,30,0.6)',
                            borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700,
                          }}>キャンセル</span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.6)', margin: '3px 0 0' }}>
                        {fmtDate(b.date)} {fmtTime(b.start_time)}〜{fmtTime(b.end_time)}　{mm.icon} {mm.label}
                        {b.status === 'pending' && tab === 'upcoming' && (
                          <span style={{ color: GOLD, fontWeight: 600 }}>　承認待ち</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {tab === 'upcoming' && other && (
                    <button
                      onClick={() => router.push(`/room/friend/chat?friendId=${other.id}`)}
                      style={{
                        width: '100%', marginTop: 10, padding: '9px 0',
                        borderRadius: 20, border: `1px solid ${GOLD}`,
                        background: 'transparent', color: '#8B6914',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      💬 チャットを開く
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 通知の案内 */}
      {tab === 'upcoming' && (
        <p style={{
          textAlign: 'center', fontSize: 12, color: 'rgba(59,47,30,0.5)',
          margin: '10px 0 0', flexShrink: 0,
        }}>
          🔔 予約30分前に通知が届きます
        </p>
      )}
    </div>
  )
}
