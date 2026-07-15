'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { UserAvatar } from '@/src/components/UserAvatar'
import { YUKI_ID, YUKI_NAME, YUKI_TAG, YUKI_LAST_PREVIEW } from '@/src/lib/mockYuki'

type UserRow = { id: string; username: string; avatar_url: string | null }
type ChatRow = {
  id: string
  username: string
  avatarUrl: string | null
  tag: string | null
  lastContent: string | null
  lastTime: string | null
  unread: number
}

// 時刻表示：今日は HH:MM、それ以外は M/D
function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// Private タブ：個人チャット（friend_messages）の履歴一覧（LINE風）
export default function FriendRoomView() {
  const router = useRouter()
  const [rows, setRows] = useState<ChatRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const uid = localStorage.getItem('user_id')
    if (!uid) { setLoading(false); return }
    ;(async () => {
      const [connRes, msgRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('connections') as any)
          .select('requester_id, receiver_id')
          .or(`requester_id.eq.${uid},receiver_id.eq.${uid}`)
          .eq('status', 'accepted'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('friend_messages') as any)
          .select('sender_id, receiver_id, content, created_at')
          .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
          .order('created_at', { ascending: false }),
      ])

      const conns = (connRes.data ?? []) as { requester_id: string; receiver_id: string }[]
      const msgs = (msgRes.data ?? []) as { sender_id: string; receiver_id: string; content: string; created_at: string }[]

      // 相手ユーザーID（つながり＋メッセージ相手）
      const partnerIds = new Set<string>()
      conns.forEach(c => partnerIds.add(c.requester_id === uid ? c.receiver_id : c.requester_id))
      msgs.forEach(m => partnerIds.add(m.sender_id === uid ? m.receiver_id : m.sender_id))

      // 相手がいなくても Yuki は表示する
      const yukiRow: ChatRow = {
        id: YUKI_ID, username: YUKI_NAME, avatarUrl: null, tag: YUKI_TAG,
        lastContent: YUKI_LAST_PREVIEW, lastTime: new Date().toISOString(), unread: 0,
      }
      if (partnerIds.size === 0) { setRows([yukiRow]); setLoading(false); return }
      const ids = [...partnerIds]

      const [usersRes, tagsRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('users') as any).select('id, username, avatar_url').in('id', ids),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('tags') as any).select('user_id, text').in('user_id', ids).eq('type', 'light').eq('is_active', true),
      ])

      const userMap = new Map<string, UserRow>(((usersRes.data ?? []) as UserRow[]).map(u => [u.id, u]))
      const tagMap = new Map<string, string>()
      for (const t of ((tagsRes.data ?? []) as { user_id: string; text: string }[])) {
        if (!tagMap.has(t.user_id)) tagMap.set(t.user_id, t.text)
      }

      // 最後のメッセージ＋未読数（最終閲覧より後の相手発言）
      const info = new Map<string, { content: string; time: string; unread: number }>()
      for (const m of msgs) {
        const pid = m.sender_id === uid ? m.receiver_id : m.sender_id
        if (!info.has(pid)) info.set(pid, { content: m.content, time: m.created_at, unread: 0 })
        const seen = localStorage.getItem(`chat_seen_${pid}`)
        if (m.sender_id === pid && (!seen || m.created_at > seen)) {
          info.get(pid)!.unread += 1
        }
      }

      const list: ChatRow[] = ids.map(pid => {
        const u = userMap.get(pid)
        const i = info.get(pid)
        return {
          id: pid,
          username: u?.username ?? '不明',
          avatarUrl: u?.avatar_url ?? null,
          tag: tagMap.get(pid) ?? null,
          lastContent: i?.content ?? null,
          lastTime: i?.time ?? null,
          unread: i?.unread ?? 0,
        }
      })
      // 最新メッセージが上（メッセージなしは下）
      list.sort((a, b) => (b.lastTime ?? '').localeCompare(a.lastTime ?? ''))

      // モックユーザー Yuki を先頭に固定表示（実データに無ければ差し込む）
      const filtered = list.filter(r => r.id !== YUKI_ID)
      setRows([yukiRow, ...filtered])
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <p style={{ textAlign: 'center', padding: '48px 24px', fontSize: 13, color: '#A09070' }}>
        読み込み中...
      </p>
    )
  }

  if (rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: '#A09070', fontSize: 14 }}>
        <p>まだチャットはありません💬</p>
        <p style={{ fontSize: 12, marginTop: 8 }}>
          HELPやRescueで話しかけてみよう
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {rows.map(r => (
        <button
          key={r.id}
          onClick={() => router.push(`/room/friend/chat?friendId=${r.id}`)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
            background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
            padding: '12px 4px',
            borderBottom: '1px solid rgba(139,115,85,0.12)',
          }}
        >
          <UserAvatar username={r.username} avatarUrl={r.avatarUrl} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{
                fontSize: 14, fontWeight: 700, color: '#3B2F1E',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {r.username}
              </span>
              {r.tag && (
                <span style={{
                  background: '#F5E1A8', color: '#7A5C00', flexShrink: 0,
                  borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 600,
                }}>
                  #{r.tag.replace(/^#+/, '')}
                </span>
              )}
            </div>
            <p style={{
              fontSize: 12, color: 'rgba(59,47,30,0.5)', margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {r.lastContent ?? 'まだメッセージがありません'}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'rgba(59,47,30,0.4)' }}>{formatTime(r.lastTime)}</span>
            {r.unread > 0 && (
              <span style={{
                minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px',
                background: '#C0392B', color: '#FFFFFF',
                fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {r.unread}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
