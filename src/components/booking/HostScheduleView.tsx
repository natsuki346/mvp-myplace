'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { UserAvatar } from '@/src/components/UserAvatar'
import {
  fetchHostSchedules, fetchBookings, createSchedule, deleteSchedule,
  confirmBooking, cancelBooking,
  fmtDate, fmtTime, isNew, METHOD_META,
  type Schedule, type Booking,
} from './api'

const GOLD = '#C9A84C'
const GREEN = '#7BAE7F'
const CARD_BG = '#FBF7EE'
const CARD_BORDER = '#E0D5BE'
const SEGMENT_BG = '#EDE5D0'

// 1時間単位のスロット（開始時刻）
const SLOT_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]

type SegTab = 'slots' | 'requests'

function pad2(n: number) { return String(n).padStart(2, '0') }
function dateKey(y: number, m: number, d: number) { return `${y}-${pad2(m + 1)}-${pad2(d)}` }

// ホスト（話を聞いてあげたい側）向け：空き時間登録＋入った予約の管理
export default function HostScheduleView({ userId }: { userId: string }) {
  const [tab, setTab] = useState<SegTab>('slots')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)

  // カレンダー表示状態
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth()) // 0-11
  const [selectedDate, setSelectedDate] = useState<string>(dateKey(now.getFullYear(), now.getMonth(), now.getDate()))

  // 保存前のローカル変更：追加スロット（date|HH:00）と削除対象のスケジュールID
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    try {
      const [s, b] = await Promise.all([
        fetchHostSchedules(userId, userId),
        fetchBookings(userId),
      ])
      setSchedules(s)
      setBookings(b.filter(x => x.host?.id === userId))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  // 日付 → 登録済みスケジュール / 予約済み時間帯
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>()
    for (const s of schedules) {
      if (!map.has(s.date)) map.set(s.date, [])
      map.get(s.date)!.push(s)
    }
    return map
  }, [schedules])

  const bookedByDate = useMemo(() => {
    const map = new Map<string, Set<string>>() // date -> 開始時刻 "HH:MM"
    for (const b of bookings) {
      if ((b.status === 'pending' || b.status === 'confirmed') && b.date && b.start_time) {
        if (!map.has(b.date)) map.set(b.date, new Set())
        map.get(b.date)!.add(b.start_time.slice(0, 5))
      }
    }
    return map
  }, [bookings])

  // ── カレンダーのセル ──
  const calendarCells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1)
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells: (number | null)[] = Array(first.getDay()).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return cells
  }, [viewYear, viewMonth])

  const moveMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  // ── スロットのトグル ──
  const toggleSlot = (hour: number) => {
    const start = `${pad2(hour)}:00`
    const key = `${selectedDate}|${start}`
    const existing = (schedulesByDate.get(selectedDate) ?? [])
      .find(s => s.start_time.slice(0, 5) === start)

    if (existing) {
      // 登録済み → 削除マークをトグル
      setRemoved(prev => {
        const next = new Set(prev)
        if (next.has(existing.id)) next.delete(existing.id)
        else next.add(existing.id)
        return next
      })
      return
    }
    // 未登録 → 追加をトグル
    setAdded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const hasChanges = added.size > 0 || removed.size > 0

  const save = async () => {
    if (!hasChanges || saving) return
    setSaving(true)
    for (const key of added) {
      const [date, start] = key.split('|')
      const endHour = parseInt(start.slice(0, 2), 10) + 1
      await createSchedule(userId, date, start, `${pad2(endHour)}:00`)
    }
    for (const id of removed) {
      await deleteSchedule(userId, id)
    }
    setAdded(new Set())
    setRemoved(new Set())
    await load()
    setSaving(false)
  }

  // ── 予約の承認・拒否 ──
  const handleConfirm = async (id: string) => {
    const ok = await confirmBooking(userId, id)
    if (ok) setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' as const } : b))
  }
  const handleCancel = async (id: string) => {
    const ok = await cancelBooking(userId, id)
    if (ok) setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' as const } : b))
  }

  if (loading) {
    return <p style={{ textAlign: 'center', paddingTop: 48, fontSize: 13, color: 'rgba(59,47,30,0.4)' }}>読み込み中...</p>
  }
  if (error) {
    return <p style={{ textAlign: 'center', paddingTop: 48, fontSize: 13, color: 'rgba(59,47,30,0.5)' }}>データを取得できませんでした</p>
  }

  const pendingReqs = bookings.filter(b => b.status === 'pending')
  const confirmedReqs = bookings.filter(b => b.status === 'confirmed')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* セグメントタブ */}
      <div style={{
        display: 'flex', background: SEGMENT_BG, borderRadius: 12, padding: 3,
        margin: '0 0 16px', flexShrink: 0,
      }}>
        {([
          { key: 'slots' as SegTab, label: '空き登録' },
          { key: 'requests' as SegTab, label: `入った予約${pendingReqs.length > 0 ? `（${pendingReqs.length}）` : ''}` },
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
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'slots' ? (
          <>
            {/* ── 月ナビゲーション ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <button onClick={() => moveMonth(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#8B6914', padding: '4px 10px' }}>‹</button>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>{viewYear}年{viewMonth + 1}月</span>
              <button onClick={() => moveMonth(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#8B6914', padding: '4px 10px' }}>›</button>
            </div>

            {/* ── カレンダー ── */}
            <div style={{
              background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 14,
              padding: '10px 8px', marginBottom: 14,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                {['日', '月', '火', '水', '木', '金', '土'].map(w => (
                  <span key={w} style={{ textAlign: 'center', fontSize: 10, color: 'rgba(59,47,30,0.45)' }}>{w}</span>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {calendarCells.map((d, i) => {
                  if (d === null) return <span key={`e${i}`} />
                  const key = dateKey(viewYear, viewMonth, d)
                  const isSelected = key === selectedDate
                  const hasSchedule = schedulesByDate.has(key)
                  const hasBooking = bookedByDate.has(key)
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(key)}
                      style={{
                        aspectRatio: '1', borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: isSelected ? GOLD : hasBooking ? `${GREEN}55` : hasSchedule ? `${GOLD}40` : 'transparent',
                        color: isSelected ? '#FFFFFF' : '#3B2F1E',
                        fontSize: 13, fontWeight: isSelected ? 700 : 500,
                      }}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── 時間スロット ── */}
            <p style={{ fontSize: 13, fontWeight: 700, color: '#8B6914', margin: '0 0 8px' }}>
              {fmtDate(selectedDate)} の空き時間（タップで追加・再タップで削除）
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
              {SLOT_HOURS.map(h => {
                const start = `${pad2(h)}:00`
                const key = `${selectedDate}|${start}`
                const existing = (schedulesByDate.get(selectedDate) ?? []).find(s => s.start_time.slice(0, 5) === start)
                const isBooked = bookedByDate.get(selectedDate)?.has(start) ?? false
                const isAdded = added.has(key)
                const isRemoved = existing ? removed.has(existing.id) : false
                const registered = !!existing && !isRemoved

                const label = `${h}:00〜${h + 1}:00`
                if (isBooked) {
                  return (
                    <div key={key} style={{
                      padding: '10px 0', borderRadius: 12, textAlign: 'center',
                      background: `${GREEN}55`, border: `1px solid ${GREEN}`,
                      fontSize: 11, fontWeight: 600, color: '#2D5A27',
                    }}>
                      {label}<br />予約済み
                    </div>
                  )
                }
                return (
                  <button
                    key={key}
                    onClick={() => toggleSlot(h)}
                    style={{
                      padding: '10px 0', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                      background: isAdded ? `${GOLD}30` : '#FFFFFF',
                      border: (registered || isAdded) ? `2px solid ${GOLD}` : `1.5px dashed ${CARD_BORDER}`,
                      opacity: isRemoved ? 0.4 : 1,
                      fontSize: 11, fontWeight: 600,
                      color: (registered || isAdded) ? '#8B6914' : 'rgba(59,47,30,0.5)',
                      textDecoration: isRemoved ? 'line-through' : 'none',
                    }}
                  >
                    {(registered || isAdded) ? label : `＋ ${label}`}
                  </button>
                )
              })}
            </div>

            {/* ── 保存 ── */}
            <button
              onClick={save}
              disabled={!hasChanges || saving}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 24, border: 'none',
                background: hasChanges && !saving ? GOLD : `${GOLD}55`,
                color: '#FFFFFF', fontSize: 14, fontWeight: 700,
                cursor: hasChanges && !saving ? 'pointer' : 'default',
                marginBottom: 8,
              }}
            >
              {saving ? '保存中...' : '保存する'}
            </button>
          </>
        ) : (
          /* ── 入った予約 ── */
          <>
            {pendingReqs.length === 0 && confirmedReqs.length === 0 ? (
              <p style={{ textAlign: 'center', paddingTop: 40, fontSize: 13, color: 'rgba(59,47,30,0.45)' }}>
                まだ予約は入っていません
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
                {[...pendingReqs, ...confirmedReqs].map(b => {
                  const other = b.guest
                  const tag = b.guest_tag
                  const mm = METHOD_META[b.method]
                  const isPending = b.status === 'pending'
                  return (
                    <div key={b.id} style={{
                      background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
                      borderRadius: 14, padding: '12px 14px',
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
                                background: '#F3D2CC', color: '#B23A2A',
                                borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 600,
                              }}>#{tag.replace(/^#+/, '')}</span>
                            )}
                            {isPending && isNew(b.created_at) && (
                              <span style={{
                                background: '#C0392B', color: '#FFFFFF',
                                borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700,
                              }}>新着</span>
                            )}
                            {b.status === 'confirmed' && (
                              <span style={{
                                background: GREEN, color: '#FFFFFF',
                                borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700,
                              }}>承認済</span>
                            )}
                          </div>
                          <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.6)', margin: '3px 0 0' }}>
                            {fmtDate(b.date)} {fmtTime(b.start_time)}〜{fmtTime(b.end_time)}　{mm.icon} {mm.label}
                          </p>
                        </div>
                      </div>

                      {isPending && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button
                            onClick={() => handleConfirm(b.id)}
                            style={{
                              flex: 1, padding: '9px 0', borderRadius: 20, border: 'none',
                              background: '#4A7C59', color: '#F5F0E8',
                              fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            承認する
                          </button>
                          <button
                            onClick={() => handleCancel(b.id)}
                            style={{
                              flex: 1, padding: '9px 0', borderRadius: 20,
                              border: '1px solid #8B6914', background: 'transparent', color: '#8B6914',
                              fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            断る
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
