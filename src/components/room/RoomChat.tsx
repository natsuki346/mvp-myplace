'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'

export type ChatMessageUser = { id: string; username: string; avatar_url: string | null }

export type ChatMessage = {
  id: string
  content: string
  created_at: string
  user_id: string
  users: ChatMessageUser | null
}

export type IntroMessage = {
  id: string
  mine: boolean
  content: string
  isSystem?: boolean
}

export type RoomChatHeader = {
  title: string
  subtitle?: string
  onBack?: () => void
  backContent?: React.ReactNode
  backColor?: string
  borderColor?: string
  extra?: React.ReactNode
}

export type RoomChatProps = {
  header: RoomChatHeader
  banner?: React.ReactNode
  introMessages?: IntroMessage[]
  introVariant?: 'chat' | 'viewonly'
  matchTagIds: string[]
  subTagId?: string | null
  channelKey: string
  ownTagId?: string | null
  readOnly?: boolean
  onMessageSent?: () => void
  overlay?: React.ReactNode
}

type RealtimeMessageRow = { id: string; tag_id: string; sub_tag_id: string | null; user_id: string }

export default function RoomChat({
  header,
  banner,
  introMessages = [],
  introVariant = 'chat',
  matchTagIds,
  subTagId = null,
  channelKey,
  ownTagId = null,
  readOnly = false,
  onMessageSent,
  overlay,
}: RoomChatProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [userId] = useState<string | null>(() => sessionStorage.getItem('user_id'))
  const [myProfile, setMyProfile] = useState<ChatMessageUser | null>(null)
  const matchingIdsRef = useRef<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    matchingIdsRef.current = new Set(matchTagIds)
  }, [matchTagIds])

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('users') as any)
        .select('id, username, avatar_url')
        .eq('id', userId)
        .single()
      setMyProfile((data as ChatMessageUser) ?? null)
    })()
  }, [userId])

  // メッセージ取得
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      if (matchTagIds.length === 0) { if (!cancelled) setMessages([]); return }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase.from('messages') as any)
        .select('id, content, created_at, user_id, users ( id, username, avatar_url )')
        .in('tag_id', matchTagIds)
        .order('created_at', { ascending: true })

      query = subTagId ? query.eq('sub_tag_id', subTagId) : query.is('sub_tag_id', null)

      const { data, error } = await query
      if (error) {
        console.error(
          `messages fetch error: message=${error.message} code=${error.code} details=${error.details} hint=${error.hint}`
        )
        return
      }
      if (!cancelled) setMessages((data as ChatMessage[]) ?? [])
    })()

    return () => { cancelled = true }
  }, [matchTagIds, subTagId])

  // リアルタイム購読：同じタグの部屋に投稿された新着メッセージを受信
  // tag_id は同じハッシュタグを持つ複数ユーザー分のIDがあり得るため、
  // postgres_changes の filter では絞り込めず matchingIdsRef で判定する
  useEffect(() => {
    const channel = supabase
      .channel(`room_${channelKey}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const row = payload.new as RealtimeMessageRow
        if (!matchingIdsRef.current.has(row.tag_id)) return
        if ((row.sub_tag_id ?? null) !== (subTagId ?? null)) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('messages') as any)
          .select('id, content, created_at, user_id, users ( id, username, avatar_url )')
          .eq('id', row.id)
          .single()

        if (data) {
          const msg = data as ChatMessage
          setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelKey, subTagId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    const content = input.trim()
    if (!content || !userId || !ownTagId) return
    setInput('')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('messages') as any)
      .insert([{ tag_id: ownTagId, user_id: userId, content, sub_tag_id: subTagId }])
      .select('id, content, created_at, user_id')
      .single()

    if (error) {
      console.error(
        `message send error: message=${error.message} code=${error.code} details=${error.details} hint=${error.hint}`
      )
      return
    }
    if (data) {
      const row: ChatMessage = { ...(data as Omit<ChatMessage, 'users'>), users: myProfile }
      setMessages(prev => (prev.some(m => m.id === row.id) ? prev : [...prev, row]))
      onMessageSent?.()
    }
  }

  const isContinuous = (index: number) =>
    index > 0 && messages[index].user_id === messages[index - 1].user_id

  return (
    <div className="flex flex-col" style={{ height: '100%', background: '#F5F0E8' }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, padding: '12px 16px',
        borderBottom: `1px solid ${header.borderColor ?? '#D4B896'}`,
        background: '#F5F0E8',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {header.onBack && (
          <div
            onClick={header.onBack}
            style={{ color: header.backColor ?? '#4A7C59', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}
          >{header.backContent ?? '‹'}</div>
        )}
        {header.extra}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#3B2F1E' }}>{header.title}</div>
          {header.subtitle && (
            <div style={{ fontSize: 11, color: '#8B6914', marginTop: 1 }}>{header.subtitle}</div>
          )}
        </div>
      </div>

      {banner}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {introMessages.map(m => {
          if (m.isSystem) {
            return (
              <div key={m.id} style={{ textAlign: 'center', marginBottom: 12 }}>
                <span style={{
                  display: 'inline-block', background: '#F5D78E', color: '#8B6914',
                  borderRadius: 12, padding: '6px 14px', fontSize: 12,
                }}>{m.content}</span>
              </div>
            )
          }
          if (introVariant === 'viewonly') {
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                <div style={{
                  maxWidth: '72%', padding: '10px 14px', borderRadius: 12,
                  background: '#EFEFEF', color: '#3B2F1E', fontSize: 14, lineHeight: 1.5,
                }}>{m.content}</div>
              </div>
            )
          }
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
              <div style={{
                maxWidth: 240, padding: '10px 14px',
                borderRadius: m.mine ? '12px 0px 12px 12px' : '0px 12px 12px 12px',
                background: m.mine ? '#4A7C59' : '#FFFFFF',
                color: m.mine ? '#F5F0E8' : '#3B2F1E',
                border: m.mine ? 'none' : '1px solid #D4B896',
                fontSize: 14, lineHeight: 1.5,
              }}>{m.content}</div>
            </div>
          )
        })}

        {messages.map((msg, index) => {
          const isMe = msg.user_id === userId
          const continuous = isContinuous(index)
          const user = isMe ? (msg.users ?? myProfile) : msg.users

          return (
            <div key={msg.id} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              flexDirection: isMe ? 'row-reverse' : 'row',
              marginBottom: continuous ? 3 : 16,
            }}>
              {continuous ? (
                <div style={{ width: 36, flexShrink: 0 }} />
              ) : (
                <div
                  onClick={() => !isMe && user?.id && router.push(`/profile/${user.id}`)}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                    cursor: isMe ? 'default' : 'pointer',
                    background: '#4A7C59', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#F5F0E8', fontSize: 15, fontWeight: 'bold',
                  }}
                >
                  {user?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span>{user?.username?.[0]?.toUpperCase() ?? '?'}</span>
                  )}
                </div>
              )}

              <div style={{
                display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 260,
                alignItems: isMe ? 'flex-end' : 'flex-start',
              }}>
                {!continuous && !isMe && (
                  <div style={{ fontSize: 11, color: '#8B6914', paddingLeft: 4 }}>
                    {user?.username ?? '匿名'}
                  </div>
                )}
                <div style={{
                  padding: '10px 14px', fontSize: 14, lineHeight: 1.5,
                  borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  background: isMe ? '#4A7C59' : '#FFFFFF',
                  color: isMe ? '#F5F0E8' : '#3B2F1E',
                  border: isMe ? 'none' : '1px solid #D4B896',
                }}>{msg.content}</div>
                <div style={{ fontSize: 10, color: '#A09070', padding: '0 4px' }}>
                  {new Date(msg.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!readOnly && (
        <div style={{
          background: '#F5F0E8', borderTop: '1px solid #D4B896', padding: '10px 12px 28px',
          display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0,
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
            placeholder="メッセージを入力..."
            style={{
              flex: 1, background: '#FFFFFF', border: '1px solid #D4B896', borderRadius: 20,
              padding: '10px 16px', fontSize: 14, color: '#3B2F1E', outline: 'none',
            }}
          />
          <button
            onClick={handleSend}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none',
              background: input.trim() ? '#4A7C59' : 'rgba(0,0,0,0.10)',
              color: input.trim() ? '#F5F0E8' : 'rgba(0,0,0,0.3)',
              fontSize: 18, cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >›</button>
        </div>
      )}

      {overlay}
    </div>
  )
}
