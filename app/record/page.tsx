'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { BottomNav } from '@/src/components/BottomNav'
import { UserAvatar } from '@/src/components/UserAvatar'
import { createVideoRoom, fetchReport, type ReportSection } from '@/src/lib/videoRoom'
import { fetchBookings, type Booking } from '@/src/components/booking/api'
import FirstVisitCoach from '@/src/components/tutorial/FirstVisitCoach'

const GOLD = '#C9A84C'
const GREEN = '#7BAE7F'
const RED = '#D98880'
const CALL_C = '#6C8EBF'
const CARD_BG = '#FBF7EE'
const CARD_BORDER = '#E0D5BE'
const SEGMENT_BG = '#EDE5D0'

type SegTab = 'schedule' | 'history' | 'record'
type RecordView = 'today' | 'calendar'
type UserRow = { id: string; username: string; avatar_url: string | null }
type MsgRow = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  type: string
}

type Feeling = 'bad' | 'normal' | 'good'
const FEELING_META: Record<Feeling, { label: string; emoji: string; color: string }> = {
  bad:    { label: 'しんどい', emoji: '😔', color: RED },
  normal: { label: '普通',     emoji: '😐', color: GOLD },
  good:   { label: '良い',     emoji: '😊', color: GREEN },
}
const FEELING_ORDER: Feeling[] = ['bad', 'normal', 'good']

type FeelingEntry = { date: string; feeling: Feeling; note?: string }
type SchedItem = {
  id: string
  partner?: { id?: string; username?: string; avatar_url?: string | null } | null
  partnerTag?: string | null
  date: string
  time: string
  at: number
  method?: string | null
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function todayKey(): string {
  return dateKey(new Date())
}
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function fmtDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return `${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`
}
function methodLabel(method?: string | null): string {
  return method === 'call' ? '📞通話'
    : method === 'meet' ? '☕会って話す'
    : method === 'text' ? '💬チャット'
    : '🎥ビデオ通話'
}

// 気持ちログ：localStorage 'feeling_log' = [{date:'YYYY-MM-DD', feeling, note?}]
// 初回は直近4週間分のサンプルを localStorage に一度だけ書き込み、以降は
// ユーザー自身の「今日の記録」がここに積み重なっていく。
function loadFeelingLog(): FeelingEntry[] {
  try {
    const raw = localStorage.getItem('feeling_log')
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length > 0) return arr
    }
  } catch { /* noop */ }
  // サンプルデータ（直近4週間分）を一度だけ生成して保存
  const sample: FeelingEntry[] = []
  const feelings: Feeling[] = ['bad', 'normal', 'good', 'normal', 'bad', 'good', 'normal', 'bad']
  for (let i = 0; i < 20; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (Math.floor(Math.random() * 26) + 2)) // 今日は空けておく
    sample.push({ date: dateKey(d), feeling: feelings[i % feelings.length] })
  }
  try { localStorage.setItem('feeling_log', JSON.stringify(sample)) } catch { /* noop */ }
  return sample
}

function saveFeelingLog(log: FeelingEntry[]) {
  try { localStorage.setItem('feeling_log', JSON.stringify(log)) } catch { /* noop */ }
}

// 通話時間（分）… 通話時間の計測は未実装のため、メッセージIDから決定的なモック値を出す
function mockDuration(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return (Math.abs(h) % 41) + 10 // 10〜50分
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}
function fmtHM(iso: string): string {
  const d = new Date(iso)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

const PERIODS: { key: 'week' | 'month' | '3month'; label: string; days: number }[] = [
  { key: 'week',   label: '1週間', days: 7 },
  { key: 'month',  label: '1ヶ月', days: 30 },
  { key: '3month', label: '3ヶ月', days: 90 },
]

export default function RecordPage() {
  const router = useRouter()
  const [tab, setTab] = useState<SegTab>('schedule')
  const [recordView, setRecordView] = useState<RecordView>('today')
  const [userId, setUserId] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<MsgRow[]>([])
  const [users, setUsers] = useState<Map<string, UserRow>>(new Map())
  const [tags, setTags] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [entering, setEntering] = useState<string | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  // 今日の記録（チェックイン）
  const [feelingLog, setFeelingLog] = useState<FeelingEntry[]>([])
  const [draftFeeling, setDraftFeeling] = useState<Feeling | null>(null)
  const [draftNote, setDraftNote] = useState('')
  const [editingToday, setEditingToday] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  // カレンダー
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d })
  const [selectedDay, setSelectedDay] = useState<string>(todayKey())
  // インサイト（ボタンを押すと数字・向き合ったテーマを表示）
  const [showInsight, setShowInsight] = useState(false)
  // AIレポート（生成ボタン → 期間選択 → 生成）
  const [period, setPeriod] = useState<'week' | 'month' | '3month'>('month')
  const [showPeriodPicker, setShowPeriodPicker] = useState(false)
  const [report, setReport] = useState<ReportSection[] | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState(false)

  useEffect(() => { setFeelingLog(loadFeelingLog()) }, [])

  useEffect(() => {
    const uid = localStorage.getItem('user_id')
    setUserId(uid)
    if (!uid) { setLoading(false); return }
    ;(async () => {
      try {
        // 予定は bookings（status='scheduled'）から取得
        fetchBookings(uid).then(setBookings).catch(() => { /* 予定なしとして扱う */ })

        // カード系メッセージ（通話履歴・記録集計用）を取得
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: err } = await (supabase.from('friend_messages') as any)
          .select('id, sender_id, receiver_id, content, created_at, type')
          .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
          .in('type', ['video_room', 'video_scheduled'])
          .order('created_at', { ascending: false })
        if (err) throw err
        const rows = (data ?? []) as MsgRow[]
        setMsgs(rows)

        const partnerIds = [...new Set(rows.map(m => m.sender_id === uid ? m.receiver_id : m.sender_id))]
        if (partnerIds.length > 0) {
          const [usersRes, tagsRes] = await Promise.all([
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase.from('users') as any).select('id, username, avatar_url').in('id', partnerIds),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase.from('tags') as any).select('user_id, text').in('user_id', partnerIds).eq('type', 'light').eq('is_active', true),
          ])
          setUsers(new Map(((usersRes.data ?? []) as UserRow[]).map(u => [u.id, u])))
          const tm = new Map<string, string>()
          for (const t of ((tagsRes.data ?? []) as { user_id: string; text: string }[])) {
            if (!tm.has(t.user_id)) tm.set(t.user_id, t.text)
          }
          setTags(tm)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const partnerOf = useCallback(
    (m: MsgRow) => (m.sender_id === userId ? m.receiver_id : m.sender_id),
    [userId],
  )

  // ── 予定（bookings status='scheduled'）を日時付きに整形（過去も含む・カレンダー用） ──
  const bookingItems = useMemo<SchedItem[]>(() => {
    return bookings
      .filter(b => b.status === 'scheduled' && b.date)
      .map(b => {
        const time = (b.start_time ?? '00:00').slice(0, 5)
        const at = new Date(`${b.date}T${time}:00`).getTime()
        const partner = b.host?.id === userId ? b.guest : b.host
        const partnerTag = b.host?.id === userId ? b.guest_tag : b.host_tag
        return { id: b.id, partner, partnerTag, date: b.date as string, time, at, method: b.method }
      })
  }, [bookings, userId])

  // 予定タブ用（未来のものを日時昇順）
  const schedules = useMemo(
    () => bookingItems.filter(x => x.at > Date.now() - 60 * 60 * 1000).sort((a, b) => a.at - b.at),
    [bookingItems],
  )

  // ── 履歴（video_room・日付降順） ──
  const history = useMemo(() => msgs.filter(m => m.type === 'video_room'), [msgs])

  // ── 今日の記録 ──
  const today = todayKey()
  const todayEntry = useMemo(() => feelingLog.find(f => f.date === today), [feelingLog, today])

  const saveToday = (feeling: Feeling) => {
    const note = draftNote.trim()
    const next = [{ date: today, feeling, note: note || undefined }, ...feelingLog.filter(f => f.date !== today)]
    setFeelingLog(next)
    saveFeelingLog(next)
    setDraftFeeling(null)
    setDraftNote('')
    setEditingToday(false)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1800)
  }

  const monthlySummary = useMemo(() => {
    const now = new Date()
    const thisMonth = history.filter(m => {
      const d = new Date(m.created_at)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    const minutes = thisMonth.reduce((sum, m) => sum + mockDuration(m.id), 0)
    const people = new Set(thisMonth.map(partnerOf)).size
    return { count: thisMonth.length, minutes, people }
  }, [history, partnerOf])

  // ── カレンダー：日付ごとの記録・通話・予定 ──
  const dayMap = useMemo(() => {
    const map = new Map<string, { feeling?: Feeling; note?: string; calls: MsgRow[]; scheds: SchedItem[] }>()
    const get = (k: string) => {
      let e = map.get(k)
      if (!e) { e = { calls: [], scheds: [] }; map.set(k, e) }
      return e
    }
    for (const f of feelingLog) { const e = get(f.date); e.feeling = f.feeling; e.note = f.note }
    for (const m of history) { get(m.created_at.slice(0, 10)).calls.push(m) }
    for (const b of bookingItems) { get(b.date).scheds.push(b) }
    return map
  }, [feelingLog, history, bookingItems])

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

  // ── 向き合ったテーマ（直近30日の通話相手のライトタグをカウント順で） ──
  const allHashtags = useMemo(() => {
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000
    const tagCount = new Map<string, number>()
    // 直近の通話から集計（最後に話した日時も記録する）
    const tagLatest = new Map<string, number>()
    for (const m of history) {
      const at = new Date(m.created_at).getTime()
      if (at < since) continue
      const t = tags.get(partnerOf(m))
      if (t) {
        const k = t.replace(/^#+/, '')
        tagCount.set(k, (tagCount.get(k) ?? 0) + 1)
        if (at > (tagLatest.get(k) ?? 0)) tagLatest.set(k, at)
      }
    }
    return [...tagCount.entries()]
      .map(([tag, count]) => ({ tag, count, latest: tagLatest.get(tag) ?? 0 }))
      .sort((a, b) => b.count - a.count || b.latest - a.latest)
  }, [history, tags, partnerOf])

  const maxTag = Math.max(1, ...allHashtags.map(h => h.count))

  // AIレポート生成：選ばれた期間で記録を切り出して送信する
  const generateReport = async (pKey: 'week' | 'month' | '3month') => {
    if (!userId || reportLoading) return
    setPeriod(pKey)
    setShowPeriodPicker(false)
    setReport(null)
    setReportError(false)
    setReportLoading(true)

    const days = PERIODS.find(p => p.key === pKey)!.days
    const since = Date.now() - days * 24 * 60 * 60 * 1000
    const feelings = feelingLog.filter(f => new Date(`${f.date}T00:00:00`).getTime() >= since)
    const calls = history.filter(m => new Date(m.created_at).getTime() >= since)
    const minutes = calls.reduce((s, m) => s + mockDuration(m.id), 0)
    const people = new Set(calls.map(partnerOf)).size
    const tagCount = new Map<string, number>()
    for (const m of calls) {
      const t = tags.get(partnerOf(m))
      if (t) { const k = t.replace(/^#+/, ''); tagCount.set(k, (tagCount.get(k) ?? 0) + 1) }
    }
    const hashtags = [...tagCount.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count)

    const records = {
      period: PERIODS.find(p => p.key === pKey)!.label,
      feelings: feelings.slice(0, 40).map(f => ({ date: f.date, feeling: f.feeling, note: f.note })),
      calls: calls.slice(0, 30).map(m => {
        const d = new Date(m.created_at)
        return { date: m.created_at.slice(0, 10), weekday: WEEKDAYS[d.getDay()], hour: d.getHours(), tag: tags.get(partnerOf(m))?.replace(/^#+/, '') ?? null }
      }),
      tags: hashtags,
      counts: { calls: calls.length, minutes, people, recordedDays: feelings.length },
    }
    const r = await fetchReport(userId, records)
    if (r && r.length > 0) setReport(r)
    else setReportError(true)
    setReportLoading(false)
  }

  // 予定の「入室する」（30分前から活性化）
  const enterRoom = async (msgId: string, partnerId: string) => {
    if (!userId || entering) return
    setEntering(msgId)
    const url = await createVideoRoom(userId, partnerId)
    if (url) window.open(url, '_blank')
    else setError(true)
    setEntering(null)
  }

  return (
    <>
    <div
      // PC時：コンテンツを max-w-2xl で中央寄せし、上部ナビ（56px）分だけ高さを縮める。translateで画面全体（サイドバー240px無視）の中央に
      className="md:max-w-2xl! md:h-[calc(100svh-56px)]! md:-translate-x-[120px]"
      style={{
        background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
        height: '100svh', overflow: 'hidden', position: 'relative',
        display: 'flex', flexDirection: 'column',
      }}>
      {/* ── ヘッダー ── */}
      <div style={{
        padding: 'calc(14px + env(safe-area-inset-top)) 20px 12px', flexShrink: 0,
        borderBottom: '1px solid rgba(139,115,85,0.15)', textAlign: 'center',
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E' }}>🕐 記録</span>
      </div>

      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        padding: '16px 20px calc(96px + env(safe-area-inset-bottom))',
      }}>
        {/* ── セグメントタブ（予定 / 履歴 / 記録） ── */}
        <div style={{
          display: 'flex', background: SEGMENT_BG, borderRadius: 12, padding: 3,
          marginBottom: 16, flexShrink: 0,
        }}>
          {([
            { key: 'schedule' as SegTab, label: '予定' },
            { key: 'history' as SegTab, label: '履歴' },
            { key: 'record' as SegTab, label: '記録' },
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
          {loading ? (
            <p style={{ textAlign: 'center', paddingTop: 48, fontSize: 13, color: 'rgba(59,47,30,0.4)' }}>読み込み中...</p>
          ) : error ? (
            <p style={{ textAlign: 'center', paddingTop: 48, fontSize: 13, color: 'rgba(59,47,30,0.5)' }}>データを取得できませんでした</p>
          ) : tab === 'schedule' ? (
            /* ══════════ 予定タブ（既存） ══════════ */
            schedules.length === 0 ? (
              <p style={{ textAlign: 'center', paddingTop: 40, fontSize: 13, color: 'rgba(59,47,30,0.45)', lineHeight: 1.7 }}>
                予定はありません。<br />チャットの「📅 予定を登録する」から追加できます
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {schedules.map(({ id, partner, partnerTag, date, time, at, method }) => {
                  const pid = partner?.id ?? ''
                  const canEnter = Date.now() >= at - 30 * 60 * 1000
                  const d = new Date(`${date}T00:00:00`)
                  return (
                    <div key={id} style={{
                      background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
                      borderRadius: 14, padding: '12px 14px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <UserAvatar username={partner?.username} avatarUrl={partner?.avatar_url ?? null} size={40} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E' }}>{partner?.username ?? '不明'}</span>
                            {partnerTag && (
                              <span style={{
                                background: '#F5E1A8', color: '#7A5C00',
                                borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 600,
                              }}>#{partnerTag.replace(/^#+/, '')}</span>
                            )}
                          </div>
                          <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.6)', margin: '3px 0 0' }}>
                            📅 {d.getMonth() + 1}/{d.getDate()} {time}〜　{methodLabel(method)}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => canEnter && pid && enterRoom(id, pid)}
                          disabled={!canEnter || entering === id}
                          style={{
                            flex: 1, padding: '9px 0', borderRadius: 20, border: 'none',
                            background: canEnter ? `linear-gradient(135deg, #F6D06B 0%, #E0A020 100%)` : 'rgba(139,115,85,0.15)',
                            color: canEnter ? '#FFFFFF' : 'rgba(59,47,30,0.4)',
                            fontSize: 12, fontWeight: 700,
                            cursor: canEnter ? 'pointer' : 'default',
                          }}
                        >
                          {entering === id ? '接続中...' : canEnter ? '入室する' : 'まだ早い'}
                        </button>
                        <button
                          onClick={() => pid && router.push(`/room/friend/chat?friendId=${pid}`)}
                          style={{
                            flex: 1, padding: '9px 0', borderRadius: 20,
                            border: `1px solid ${GOLD}`, background: 'transparent', color: '#8B6914',
                            fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          チャット
                        </button>
                      </div>
                    </div>
                  )
                })}
                <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(59,47,30,0.5)', margin: '6px 0 0' }}>
                  🔔 予定時刻の30分前に通知が届きます
                </p>
              </div>
            )
          ) : tab === 'history' ? (
            /* ══════════ 履歴タブ（既存） ══════════ */
            history.length === 0 ? (
              <p style={{ textAlign: 'center', paddingTop: 40, fontSize: 13, color: 'rgba(59,47,30,0.45)' }}>
                まだ通話の履歴はありません
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.map(m => {
                  const pid = partnerOf(m)
                  const u = users.get(pid)
                  return (
                    <div key={m.id} style={{
                      background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
                      borderRadius: 14, padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <UserAvatar username={u?.username} avatarUrl={u?.avatar_url ?? null} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E' }}>{u?.username ?? '不明'}</span>
                        <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.6)', margin: '3px 0 0' }}>
                          🎥 {fmtDateTime(m.created_at)}・約{mockDuration(m.id)}分
                        </p>
                      </div>
                      <button
                        onClick={() => router.push(`/room/friend/chat?friendId=${pid}`)}
                        style={{
                          padding: '8px 12px', borderRadius: 20, flexShrink: 0,
                          border: `1px solid ${GOLD}`, background: 'transparent', color: '#8B6914',
                          fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        またビデオ通話する
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            /* ══════════ 記録タブ（今日 / カレンダー） ══════════ */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* 記録タブ内のサブ切り替え */}
              <div style={{ display: 'flex', gap: 6 }}>
                {([
                  { key: 'today' as RecordView, label: 'デイリー' },
                  { key: 'calendar' as RecordView, label: '記録' },
                ]).map(v => {
                  const on = recordView === v.key
                  return (
                    <button
                      key={v.key}
                      onClick={() => setRecordView(v.key)}
                      style={{
                        flex: 1, padding: '7px 0', borderRadius: 20, cursor: 'pointer',
                        border: on ? `1.5px solid ${GOLD}` : '1px solid rgba(139,115,85,0.2)',
                        background: on ? '#FBEFC6' : '#FFFFFF',
                        color: on ? '#8B6914' : 'rgba(59,47,30,0.5)',
                        fontSize: 12, fontWeight: on ? 700 : 500,
                      }}
                    >
                      {v.label}
                    </button>
                  )
                })}
              </div>

              {recordView === 'today' ? (
                /* ── 記録・今日：チェックイン／サマリー／向き合ったテーマ／AIレポート ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* ① 今日の記録（チェックイン）── この画面の主役 */}
                  <div style={{
                    background: 'linear-gradient(160deg, #FFFDF7 0%, #F6EFDD 100%)',
                    border: `1.5px solid ${GOLD}`, borderRadius: 18, padding: '16px 16px 18px',
                    boxShadow: '0 4px 14px rgba(201,168,76,0.14)',
                  }}>
                    {(!todayEntry || editingToday) ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <p style={{ fontSize: 15, fontWeight: 700, color: '#3B2F1E', margin: 0 }}>
                            {editingToday ? '今日の記録を編集' : '今日の気分は？'}
                          </p>
                          <span style={{ fontSize: 11, color: 'rgba(59,47,30,0.45)' }}>
                            {new Date().getMonth() + 1}/{new Date().getDate()}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.55)', margin: '0 0 14px', lineHeight: 1.6 }}>
                          毎日ひとつ、いまの気持ちを残しておきましょう🌱
                        </p>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                          {FEELING_ORDER.map(f => {
                            const on = draftFeeling === f
                            const meta = FEELING_META[f]
                            return (
                              <button
                                key={f}
                                onClick={() => setDraftFeeling(f)}
                                style={{
                                  flex: 1, padding: '12px 0', borderRadius: 14, cursor: 'pointer',
                                  border: on ? `2px solid ${meta.color}` : '1px solid rgba(139,115,85,0.2)',
                                  background: on ? `${meta.color}22` : '#FFFFFF',
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                                  transform: on ? 'translateY(-2px)' : 'none',
                                  transition: 'transform 0.15s ease, background 0.15s ease, border 0.15s ease',
                                }}
                              >
                                <span style={{ fontSize: 26, lineHeight: 1 }}>{meta.emoji}</span>
                                <span style={{ fontSize: 11, fontWeight: on ? 700 : 500, color: on ? meta.color : 'rgba(59,47,30,0.6)' }}>
                                  {meta.label}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                        <textarea
                          value={draftNote}
                          onChange={e => setDraftNote(e.target.value)}
                          maxLength={140}
                          placeholder="今日はどんな一日でしたか？（任意）"
                          rows={2}
                          style={{
                            width: '100%', boxSizing: 'border-box', resize: 'none',
                            border: '1px solid rgba(139,115,85,0.22)', borderRadius: 12,
                            padding: '10px 12px', fontSize: 13, color: '#3B2F1E',
                            background: '#FFFFFF', fontFamily: 'inherit', lineHeight: 1.6,
                            marginBottom: 12,
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          {editingToday && (
                            <button
                              onClick={() => { setEditingToday(false); setDraftFeeling(null); setDraftNote('') }}
                              style={{
                                padding: '11px 16px', borderRadius: 22, border: '1px solid rgba(139,115,85,0.25)',
                                background: 'transparent', color: 'rgba(59,47,30,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                              }}
                            >
                              やめる
                            </button>
                          )}
                          <button
                            onClick={() => draftFeeling && saveToday(draftFeeling)}
                            disabled={!draftFeeling}
                            style={{
                              flex: 1, padding: '11px 0', borderRadius: 22, border: 'none',
                              background: draftFeeling ? `linear-gradient(135deg, #F6D06B 0%, #E0A020 100%)` : 'rgba(139,115,85,0.15)',
                              color: draftFeeling ? '#FFFFFF' : 'rgba(59,47,30,0.4)',
                              fontSize: 14, fontWeight: 700, cursor: draftFeeling ? 'pointer' : 'default',
                            }}
                          >
                            記録する
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>
                            {justSaved ? '✓ 記録しました' : '✓ 今日の記録'}
                          </span>
                          <button
                            onClick={() => { setEditingToday(true); setDraftFeeling(todayEntry.feeling); setDraftNote(todayEntry.note ?? '') }}
                            style={{ border: 'none', background: 'none', color: '#8B6914', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                          >
                            編集
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 40, lineHeight: 1 }}>{FEELING_META[todayEntry.feeling].emoji}</span>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E', margin: 0 }}>
                              「{FEELING_META[todayEntry.feeling].label}」な一日
                            </p>
                            {todayEntry.note
                              ? <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.7)', margin: '4px 0 0', lineHeight: 1.6 }}>{todayEntry.note}</p>
                              : <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.4)', margin: '4px 0 0' }}>また明日も記録しましょう</p>}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* インサイトボタン → 全画面モーダル */}
                  <button
                    onClick={() => setShowInsight(true)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
                      background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>📊</span> インサイト
                    </span>
                    <span style={{ fontSize: 18, color: '#8B6914' }}>›</span>
                  </button>

                  {/* AIレポート（生成 → 期間選択 → 生成） */}
                  <div style={{ background: '#FBEFC6', border: `1.5px solid ${GOLD}`, borderRadius: 16, padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#8B6914' }}>✦ AIレポート</span>
                      {report && (
                        <span style={{ fontSize: 11, color: 'rgba(59,47,30,0.5)', marginLeft: 'auto' }}>
                          {PERIODS.find(p => p.key === period)!.label}のふりかえり
                        </span>
                      )}
                    </div>

                    {report ? (
                      /* 生成結果 */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {report.map((s, i) => (
                          <div key={i}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#3B2F1E', margin: '0 0 4px' }}>{s.title}</p>
                            <p style={{ fontSize: 13, color: '#3B2F1E', margin: 0, lineHeight: 1.8 }}>{s.body}</p>
                          </div>
                        ))}
                        <button
                          onClick={() => { setReport(null); setReportError(false); setShowPeriodPicker(true) }}
                          style={{
                            alignSelf: 'flex-start', marginTop: 2, padding: '7px 14px', borderRadius: 18,
                            border: `1px solid ${GOLD}`, background: 'transparent', color: '#8B6914',
                            fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          期間を変えて再生成
                        </button>
                      </div>
                    ) : reportLoading ? (
                      /* 生成中 */
                      <p style={{ fontSize: 13, color: '#3B2F1E', margin: 0, lineHeight: 1.7 }}>
                        {PERIODS.find(p => p.key === period)!.label}の記録を読み解いています…
                      </p>
                    ) : showPeriodPicker ? (
                      /* 期間選択 */
                      <>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2F1E', margin: '0 0 12px', lineHeight: 1.7 }}>
                          どのくらいの期間のレポートを出しますか？
                        </p>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                          {PERIODS.map(p => (
                            <button
                              key={p.key}
                              onClick={() => generateReport(p.key)}
                              style={{
                                flex: 1, padding: '11px 0', borderRadius: 14, cursor: 'pointer',
                                border: `1.5px solid ${GOLD}`, background: '#FFFFFF', color: '#8B6914',
                                fontSize: 13, fontWeight: 700,
                              }}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setShowPeriodPicker(false)}
                          style={{
                            border: 'none', background: 'none', color: 'rgba(59,47,30,0.5)',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0,
                          }}
                        >
                          やめる
                        </button>
                      </>
                    ) : (
                      /* 初期／エラー */
                      <>
                        <p style={{ fontSize: 13, color: '#3B2F1E', margin: '0 0 14px', lineHeight: 1.7 }}>
                          {reportError
                            ? 'レポートを生成できませんでした。少し時間をおいて、もう一度お試しください。'
                            : 'あなたの気持ち・通話・向き合ったテーマの記録から、AIが振り返りレポートを作成します。'}
                        </p>
                        <button
                          onClick={() => { setReportError(false); setShowPeriodPicker(true) }}
                          style={{
                            width: '100%', padding: '12px 0', borderRadius: 22, border: 'none',
                            background: `linear-gradient(135deg, #F6D06B 0%, #E0A020 100%)`,
                            color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          {reportError ? 'もう一度生成する' : 'レポートを生成する'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

              ) : (
                /* ── 記録・カレンダー：行動履歴 ── */
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
              )}
            </div>
          )}
        </div>
      </div>
    </div>

      {/* ── インサイト全画面モーダル（fixed。transform対象の外に出す） ── */}
      {showInsight && (
        <div
          className="md:max-w-2xl!"
          style={{
            position: 'fixed', inset: 0, zIndex: 200, maxWidth: 390, margin: '0 auto',
            background: '#F5F0E8', display: 'flex', flexDirection: 'column',
          }}>
          {/* ヘッダー */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 'calc(14px + env(safe-area-inset-top)) 20px 14px',
            borderBottom: '1px solid rgba(139,115,85,0.15)', flexShrink: 0,
          }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E' }}>📊 インサイト</span>
            <button
              onClick={() => setShowInsight(false)}
              style={{ border: 'none', background: 'none', fontSize: 22, color: 'rgba(59,47,30,0.5)', cursor: 'pointer', padding: '0 4px' }}
            >✕</button>
          </div>

          {/* スクロールコンテンツ */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px calc(40px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* サマリー */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: '今月話した回数', value: `${monthlySummary.count}`, unit: '回' },
                { label: '合計時間', value: `${monthlySummary.minutes}`, unit: '分' },
                { label: '話した人数', value: `${monthlySummary.people}`, unit: '人' },
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
                  borderRadius: 16, padding: '16px 6px', textAlign: 'center',
                }}>
                  <p style={{ margin: 0, color: '#3B2F1E' }}>
                    <span style={{ fontSize: 24, fontWeight: 800 }}>{s.value}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, marginLeft: 2 }}>{s.unit}</span>
                  </p>
                  <p style={{ fontSize: 10, color: 'rgba(59,47,30,0.5)', margin: '5px 0 0' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* 向き合ったテーマ ランキング */}
            <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E', margin: 0 }}>向き合ったテーマ</p>
                <span style={{ fontSize: 11, color: 'rgba(59,47,30,0.45)' }}>直近30日</span>
              </div>
              {allHashtags.length === 0 ? (
                <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.45)', margin: 0, lineHeight: 1.7 }}>
                  直近30日に話した記録がまだありません。
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {allHashtags.slice(0, 8).map((h, i) => {
                    const rankMeta = [
                      { medal: '🥇', bg: 'linear-gradient(135deg, #FFF3C4 0%, #FFE57A 100%)', border: '#E0C040' },
                      { medal: '🥈', bg: 'linear-gradient(135deg, #F0F0F0 0%, #D8D8D8 100%)', border: '#B0B0B0' },
                      { medal: '🥉', bg: 'linear-gradient(135deg, #FFE8D6 0%, #E8B090 100%)', border: '#C07850' },
                    ]
                    const rank = rankMeta[i]
                    const barW = `${(h.count / maxTag) * 100}%`
                    return (
                      <div
                        key={h.tag}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: rank ? '10px 12px' : '8px 12px',
                          borderRadius: 12,
                          background: rank ? rank.bg : 'transparent',
                          border: rank ? `1px solid ${rank.border}40` : '1px solid transparent',
                        }}
                      >
                        {/* 順位 */}
                        <span style={{ fontSize: rank ? 20 : 13, width: 28, textAlign: 'center', flexShrink: 0, fontWeight: 700, color: 'rgba(59,47,30,0.4)' }}>
                          {rank ? rank.medal : `${i + 1}`}
                        </span>
                        {/* タグ名 + バー */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#3B2F1E', margin: '0 0 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            #{h.tag}
                          </p>
                          <div style={{ height: 5, background: 'rgba(139,115,85,0.15)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: barW, height: '100%', background: `linear-gradient(90deg, #F6D06B, #E0A020)`, borderRadius: 3 }} />
                          </div>
                        </div>
                        {/* 回数 */}
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#8B6914', flexShrink: 0 }}>{h.count}回</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />

      {/* ── 初回訪問時の説明 ── */}
      <FirstVisitCoach
        storageKey="coach_record_v2"
        heading="🕐 記録"
        lines={[
          { icon: '📅', title: '予定', desc: 'これから話す約束を確認し、時間になったら入室できます。' },
          { icon: '🎥', title: '履歴', desc: '過去に話した相手や通話の記録を振り返れます。' },
          { icon: '📝', title: '記録', desc: '毎日の気分の記録・向き合ったテーマ・カレンダー・AIレポートをまとめて見られます。' },
        ]}
        note="※ 一部の集計は準備中のサンプルを含みます。内容は今後さらに充実していきます。"
      />
    </>
  )
}
