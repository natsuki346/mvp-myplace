'use client'

import { useEffect, useState } from 'react'
import { UserAvatar } from '@/src/components/UserAvatar'
import {
  fetchHostSchedules, createBooking, fmtDate, fmtTime, METHOD_META,
  type Schedule,
} from './api'

const GOLD = '#C9A84C'
const CARD_BORDER = '#E0D5BE'

// ホストの空き時間を選んで予約するモーダル（HELP一覧のホストから開く）
export default function BookScheduleModal({
  hostUserId, hostName, hostTag, hostMethods, onClose,
}: {
  hostUserId: string
  hostName: string
  hostTag: string
  hostMethods: string[]
  onClose: () => void
}) {
  const [visible, setVisible] = useState(false)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [method, setMethod] = useState<string | null>(hostMethods.length === 1 ? hostMethods[0] : null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const uid = localStorage.getItem('user_id')
    if (!uid) { setLoading(false); return }
    fetchHostSchedules(uid, hostUserId)
      .then(setSchedules)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [hostUserId])

  const close = () => { setVisible(false); setTimeout(onClose, 200) }

  const submit = async () => {
    const uid = localStorage.getItem('user_id')
    if (!uid || !selectedId || !method || submitting) return
    setSubmitting(true)
    const ok = await createBooking(uid, hostUserId, selectedId, method)
    if (ok) setDone(true)
    else setError(true)
    setSubmitting(false)
  }

  // 日付ごとにグループ化
  const byDate = new Map<string, Schedule[]>()
  for (const s of schedules) {
    if (!byDate.has(s.date)) byDate.set(s.date, [])
    byDate.get(s.date)!.push(s)
  }

  const canSubmit = !!selectedId && !!method && !submitting

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 520,
        background: 'rgba(59,47,30,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        opacity: visible ? 1 : 0, transition: 'opacity 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 330, maxHeight: '80svh',
          display: 'flex', flexDirection: 'column',
          background: '#F5F0E8', borderRadius: 20, padding: '22px 18px',
          position: 'relative',
          transform: visible ? 'scale(1)' : 'scale(0.95)', transition: 'transform 0.2s ease',
        }}
      >
        <button
          onClick={close}
          aria-label="閉じる"
          style={{
            position: 'absolute', top: 12, right: 14,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 18, color: 'rgba(59,47,30,0.4)', lineHeight: 1, padding: 2,
          }}
        >✕</button>

        {done ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <p style={{ fontSize: 34, margin: '0 0 8px' }}>📅</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E', margin: '0 0 6px' }}>
              予約リクエストを送りました
            </p>
            <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.6)', margin: '0 0 20px', lineHeight: 1.6 }}>
              {hostName}さんが承認すると予約が確定し、<br />チャットに通知が届きます
            </p>
            <button
              onClick={close}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 24,
                border: '1px solid #8B6914', background: 'transparent', color: '#8B6914',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              閉じる
            </button>
          </div>
        ) : (
          <>
            {/* 相手 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexShrink: 0 }}>
              <UserAvatar username={hostName} avatarUrl={null} size={40} />
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>{hostName}さんに予約</p>
                <span style={{
                  background: '#F5E1A8', color: '#7A5C00',
                  borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 600,
                }}>#{hostTag}</span>
              </div>
            </div>

            {/* 空き時間一覧 */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
              {loading ? (
                <p style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'rgba(59,47,30,0.4)' }}>読み込み中...</p>
              ) : error ? (
                <p style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'rgba(59,47,30,0.5)' }}>データを取得できませんでした</p>
              ) : schedules.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'rgba(59,47,30,0.5)', lineHeight: 1.6 }}>
                  いま空いている時間がありません。<br />「今すぐ話す」で声をかけてみましょう
                </p>
              ) : (
                [...byDate.entries()].map(([date, slots]) => (
                  <div key={date} style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#8B6914', margin: '0 0 6px' }}>{fmtDate(date)}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {slots.map(s => {
                        const on = selectedId === s.id
                        return (
                          <button
                            key={s.id}
                            onClick={() => setSelectedId(on ? null : s.id)}
                            style={{
                              padding: '7px 12px', borderRadius: 12, cursor: 'pointer',
                              background: on ? `${GOLD}30` : '#FFFFFF',
                              border: on ? `2px solid ${GOLD}` : `1px solid ${CARD_BORDER}`,
                              fontSize: 12, fontWeight: 600, color: on ? '#8B6914' : '#3B2F1E',
                            }}
                          >
                            {fmtTime(s.start_time)}〜{fmtTime(s.end_time)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 方法選択（ホストの対応可能手段のみ） */}
            {schedules.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexShrink: 0 }}>
                {hostMethods.map(m => {
                  const meta = METHOD_META[m]
                  const on = method === m
                  return (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      style={{
                        flex: 1, padding: '9px 4px', borderRadius: 12, cursor: 'pointer',
                        background: on ? '#FBEFC6' : '#FFFFFF',
                        border: on ? `2px solid ${GOLD}` : `1px solid ${CARD_BORDER}`,
                        fontSize: 12, fontWeight: 600, color: '#3B2F1E',
                      }}
                    >
                      {meta.icon} {meta.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* 確定 */}
            <button
              onClick={submit}
              disabled={!canSubmit}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 24, border: 'none',
                background: canSubmit ? `linear-gradient(135deg, #F6D06B 0%, #E0A020 100%)` : 'rgba(224,160,32,0.35)',
                color: '#FFFFFF', fontSize: 14, fontWeight: 700,
                cursor: canSubmit ? 'pointer' : 'default', flexShrink: 0,
              }}
            >
              {submitting ? '送信中...' : '予約を確定する'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
