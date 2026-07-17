'use client'

// 月カレンダー＋選択日の詳細。
// もとは app/record/page.tsx の記録タブ（calendar ビュー）。
// 表示中の月（calMonth）と選択日（selectedDay）は内部 state で保持する。

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  GOLD, GREEN, CALL_C, CARD_BG, CARD_BORDER, WEEKDAYS,
  FEELING_META, fmtDay, fmtHM, methodLabel, mockDuration, todayKey,
  type MsgRow, type UserRow, type DayData,
} from './recordShared'

type Props = {
  dayMap: Map<string, DayData>
  users: Map<string, UserRow>
  partnerOf: (m: MsgRow) => string
  enterRoom: (msgId: string, partnerId: string) => void
}

export default function CalendarSection({ dayMap, users, partnerOf, enterRoom }: Props) {
  const router = useRouter()
  const today = todayKey()
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d })
  const [selectedDay, setSelectedDay] = useState<string>(today)

  const calCells = useMemo(() => {
    const year = calMonth.getFullYear(), month = calMonth.getMonth()
    const firstDow = new Date(year, month, 1).getDay()
    const daysIn = new Date(year, month + 1, 0).getDate()
    const arr: (string | null)[] = []
    for (let i = 0; i < firstDow; i++) arr.push(null)
    for (let d = 1; d <= daysIn; d++) arr.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [calMonth])

  const selectedData = dayMap.get(selectedDay)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 月ナビ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          style={{ border: 'none', background: 'none', fontSize: 20, color: '#8B6914', cursor: 'pointer', padding: '4px 10px' }}
        >‹</button>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>
          {calMonth.getFullYear()}年 {calMonth.getMonth() + 1}月
        </span>
        <button
          onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          style={{ border: 'none', background: 'none', fontSize: 20, color: '#8B6914', cursor: 'pointer', padding: '4px 10px' }}
        >›</button>
      </div>

      {/* カレンダーグリッド */}
      <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, padding: '12px 10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
          {WEEKDAYS.map((w, i) => (
            <span key={w} style={{
              textAlign: 'center', fontSize: 10, fontWeight: 700,
              color: i === 0 ? '#C86B5C' : i === 6 ? '#5C7BA8' : 'rgba(59,47,30,0.45)',
            }}>{w}</span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {calCells.map((c, i) => {
            if (!c) return <div key={`e${i}`} />
            const data = dayMap.get(c)
            const isToday = c === today
            const isSel = c === selectedDay
            const dayNum = Number(c.slice(8))
            return (
              <button
                key={c}
                onClick={() => setSelectedDay(c)}
                style={{
                  aspectRatio: '1', border: isSel ? `2px solid ${GOLD}` : '1px solid transparent',
                  borderRadius: 10, cursor: 'pointer', padding: 0,
                  background: data?.feeling ? `${FEELING_META[data.feeling].color}26` : '#FFFFFF',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                }}
              >
                <span style={{
                  fontSize: 12, fontWeight: isToday ? 800 : 500,
                  color: isToday ? '#8B6914' : '#3B2F1E',
                }}>{dayNum}</span>
                <div style={{ display: 'flex', gap: 2, height: 5, alignItems: 'center' }}>
                  {data?.calls.length ? <span style={{ width: 5, height: 5, borderRadius: '50%', background: CALL_C }} /> : null}
                  {data?.scheds.length ? <span style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD }} /> : null}
                </div>
              </button>
            )
          })}
        </div>
        {/* 凡例 */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 10 }}>
          <span style={{ fontSize: 10, color: 'rgba(59,47,30,0.55)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: `${GREEN}80` }} />気分の記録
          </span>
          <span style={{ fontSize: 10, color: 'rgba(59,47,30,0.55)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: CALL_C }} />通話
          </span>
          <span style={{ fontSize: 10, color: 'rgba(59,47,30,0.55)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD }} />予定
          </span>
        </div>
      </div>

      {/* 選択日の詳細 */}
      <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, padding: '14px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E', margin: '0 0 12px' }}>{fmtDay(selectedDay)}</p>

        {!selectedData || (!selectedData.feeling && selectedData.calls.length === 0 && selectedData.scheds.length === 0) ? (
          <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.45)', margin: 0, lineHeight: 1.7 }}>この日の記録はありません。</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 気分 */}
            {selectedData.feeling && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 26, lineHeight: 1.1 }}>{FEELING_META[selectedData.feeling].emoji}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#3B2F1E', margin: 0 }}>「{FEELING_META[selectedData.feeling].label}」な一日</p>
                  {selectedData.note && <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.7)', margin: '3px 0 0', lineHeight: 1.6 }}>{selectedData.note}</p>}
                </div>
              </div>
            )}

            {/* 予定 */}
            {selectedData.scheds.map(s => {
              const pid = s.partner?.id ?? ''
              const canEnter = Date.now() >= s.at - 30 * 60 * 1000 && Date.now() <= s.at + 60 * 60 * 1000
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2F1E', margin: 0 }}>
                      📅 {s.time}〜 {s.partner?.username ?? '相手'}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(59,47,30,0.55)', margin: '1px 0 0' }}>{methodLabel(s.method)}（予定）</p>
                  </div>
                  <button
                    onClick={() => canEnter ? (pid && enterRoom(s.id, pid)) : (pid && router.push(`/room/friend/chat?friendId=${pid}`))}
                    style={{
                      flexShrink: 0, padding: '6px 12px', borderRadius: 18, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      border: `1px solid ${GOLD}`, background: canEnter ? `linear-gradient(135deg, #F6D06B 0%, #E0A020 100%)` : 'transparent',
                      color: canEnter ? '#FFFFFF' : '#8B6914',
                    }}
                  >
                    {canEnter ? '入室' : 'チャット'}
                  </button>
                </div>
              )
            })}

            {/* 通話履歴 */}
            {selectedData.calls.map(m => {
              const pid = partnerOf(m)
              const u = users.get(pid)
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: CALL_C, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2F1E', margin: 0 }}>
                      🎥 {fmtHM(m.created_at)} {u?.username ?? '不明'}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(59,47,30,0.55)', margin: '1px 0 0' }}>約{mockDuration(m.id)}分 話しました</p>
                  </div>
                  <button
                    onClick={() => pid && router.push(`/room/friend/chat?friendId=${pid}`)}
                    style={{
                      flexShrink: 0, padding: '6px 12px', borderRadius: 18, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      border: `1px solid ${GOLD}`, background: 'transparent', color: '#8B6914',
                    }}
                  >
                    チャット
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
