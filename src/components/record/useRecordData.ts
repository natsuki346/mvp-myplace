'use client'

// 記録系データの一括ロード＋派生値をまとめた共有フック。
// もとは app/record/page.tsx の RecordContent 内にあったデータ取得・useMemo を
// そのまま移設したもの（ロジックは変更なし）。プロフィール埋め込みでも
// /record 単体表示でも同じフックを1回呼べば全セクションを賄える。

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/src/lib/supabase/client'
import { createVideoRoom } from '@/src/lib/videoRoom'
import { fetchBookings, type Booking } from '@/src/components/booking/api'
import {
  type UserRow, type MsgRow, type Feeling, type FeelingEntry, type SchedItem, type DayData,
  todayKey, mockDuration, loadFeelingLog, saveFeelingLog,
} from './recordShared'

export type RecordData = ReturnType<typeof useRecordData>

export function useRecordData(userId: string | null) {
  const [msgs, setMsgs] = useState<MsgRow[]>([])
  const [users, setUsers] = useState<Map<string, UserRow>>(new Map())
  const [tags, setTags] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [entering, setEntering] = useState<string | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [feelingLog, setFeelingLog] = useState<FeelingEntry[]>([])

  useEffect(() => { setFeelingLog(loadFeelingLog()) }, [])

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    const uid = userId
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
  }, [userId])

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

  const saveToday = useCallback((feeling: Feeling, note?: string) => {
    const trimmed = (note ?? '').trim()
    setFeelingLog(prev => {
      const next = [{ date: today, feeling, note: trimmed || undefined }, ...prev.filter(f => f.date !== today)]
      saveFeelingLog(next)
      return next
    })
  }, [today])

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
    const map = new Map<string, DayData>()
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

  // ── 向き合ったテーマ（直近30日の通話相手のライトタグをカウント順で） ──
  const allHashtags = useMemo(() => {
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000
    const tagCount = new Map<string, number>()
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

  // 予定/カレンダーの「入室する」（30分前から活性化）
  const enterRoom = useCallback(async (msgId: string, partnerId: string) => {
    if (!userId || entering) return
    setEntering(msgId)
    const url = await createVideoRoom(userId, partnerId)
    if (url) window.open(url, '_blank')
    else setError(true)
    setEntering(null)
  }, [userId, entering])

  return {
    userId, loading, error,
    users, tags, msgs, bookings,
    feelingLog, setFeelingLog,
    today, todayEntry, saveToday,
    bookingItems, schedules, history,
    partnerOf, dayMap, monthlySummary, allHashtags, maxTag,
    entering, enterRoom,
  }
}
