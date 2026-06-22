'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { UserAvatar } from '@/src/components/UserAvatar'

type ChatUser = { id: string; username: string; avatar_url: string | null }
type Message = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  sender?: ChatUser | null
}

const formatDateLabel = (iso: string): string => {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return '今日'
  if (d.toDateString() === yesterday.toDateString()) return '昨日'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const shouldShowDateDivider = (messages: Message[], index: number): boolean => {
  if (index === 0) return true
  const prev = new Date(messages[index - 1].created_at).toDateString()
  const curr = new Date(messages[index].created_at).toDateString()
  return prev !== curr
}

function FriendChatContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const friendId = searchParams.get('friendId') ?? ''

  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [friend, setFriend] = useState<ChatUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    ;(async () => {
      const uid = sessionStorage.getItem('user_id')
      if (!uid || !friendId) {
        setLoading(false)
        return
      }
      setMyUserId(uid)

      const [friendRes, messagesRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('users') as any)
          .select('id, username, avatar_url')
          .eq('id', friendId)
          .single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('friend_messages') as any)
          .select('*, sender:users!sender_id(id, username, avatar_url)')
          .or(`and(sender_id.eq.${uid},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${uid})`)
          .order('created_at', { ascending: true }),
      ])

      if (cancelled) return
      const friendUser = (friendRes.data as ChatUser) ?? null
      setFriend(friendUser)
      setMessages((messagesRes.data as Message[]) ?? [])
      setLoading(false)

      // Realtime購読：相手からの新着メッセージを受信
      channel = supabase
        .channel(`friend_chat_${friendId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_messages',
          filter: `receiver_id=eq.${uid}`,
        }, (payload) => {
          const row = payload.new as Message
          if (row.sender_id !== friendId) return
          setMessages(prev => (prev.some(m => m.id === row.id) ? prev : [...prev, { ...row, sender: friendUser }]))
        })
        .subscribe()
    })()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [friendId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    const content = input.trim()
    if (!content || !myUserId || !friendId) return
    setInput('')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('friend_messages') as any)
      .insert({ sender_id: myUserId, receiver_id: friendId, content })
      .select('*, sender:users!sender_id(id, username, avatar_url)')
      .single()

    if (!error && data) {
      const row = data as Message
      setMessages(prev => (prev.some(m => m.id === row.id) ? prev : [...prev, row]))
    }
  }

  if (loading) {
    return (
      <div style={{ background: '#F5F0E8', maxWidth: 390, margin: '0 auto', minHeight: '100svh' }}>
        <p style={{ textAlign: 'center', paddingTop: 80, fontSize: 13, color: '#A09070' }}>読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '100svh', maxWidth: 390, margin: '0 auto', background: '#F5F0E8' }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, padding: '16px 20px',
        borderBottom: '1px solid #D4B896',
        background: '#F5F0E8',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8B6914', lineHeight: 1, padding: 0 }}
        >‹</button>
        <div
          onClick={() => router.push(`/profile/view?userId=${friendId}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <UserAvatar username={friend?.username} avatarUrl={friend?.avatar_url} size={36} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>
            {friend?.username}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.map((msg, index) => {
          const mine = msg.sender_id === myUserId
          return (
            <div key={msg.id}>
              {shouldShowDateDivider(messages, index) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 8px' }}>
                  <div style={{ flex: 1, height: .5, background: 'rgba(139,105,20,0.2)' }} />
                  <span style={{ fontSize: 11, color: 'rgba(139,105,20,0.55)', whiteSpace: 'nowrap' }}>
                    {formatDateLabel(msg.created_at)}
                  </span>
                  <div style={{ flex: 1, height: .5, background: 'rgba(139,105,20,0.2)' }} />
                </div>
              )}
              <div
                style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}
              >
                {!mine && (
                  <UserAvatar
                    username={msg.sender?.username}
                    avatarUrl={msg.sender?.avatar_url}
                    size={32}
                    onClick={() => router.push(`/profile/view?userId=${msg.sender_id}`)}
                  />
                )}
                <div style={{
                  maxWidth: '72%', padding: '10px 14px',
                  borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: mine ? '#4A7C59' : '#F5F0E8',
                  color: mine ? '#F5F0E8' : '#3B2F1E',
                  border: mine ? 'none' : '1px solid #D4B896',
                  fontSize: 14, lineHeight: 1.5,
                }}>
                  <p style={{ margin: 0 }}>{msg.content}</p>
                </div>
                {mine && (
                  <UserAvatar
                    username={msg.sender?.username}
                    avatarUrl={msg.sender?.avatar_url}
                    size={32}
                    onClick={() => router.push(`/profile/view?userId=${msg.sender_id}`)}
                  />
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        flexShrink: 0, padding: '10px 16px 28px',
        borderTop: '1px solid #D4B896',
        display: 'flex', gap: 10, alignItems: 'center',
        background: '#F5F0E8',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
          placeholder="メッセージを入力..."
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 20,
            border: '1.5px solid #D4B896', outline: 'none',
            fontSize: 14, color: '#3B2F1E', background: '#FFFFFF',
          }}
        />
        <button
          onClick={handleSend}
          style={{
            width: 38, height: 38, borderRadius: '50%', border: 'none',
            background: input.trim() ? '#4A7C59' : 'rgba(139,105,20,0.12)',
            color: input.trim() ? '#F5F0E8' : 'rgba(139,105,20,0.35)',
            fontSize: 16, cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >›</button>
      </div>
    </div>
  )
}

export default function FriendChatPage() {
  return (
    <Suspense fallback={null}>
      <FriendChatContent />
    </Suspense>
  )
}
