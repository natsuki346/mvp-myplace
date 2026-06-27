'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'

type Message = {
  id: string
  sender_id: string
  content: string
  created_at: string
}

const POLL_INTERVAL_MS = 5000

const formatDateLabel = (iso: string): string => {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
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

function LotteryRoomContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomTag = searchParams.get('tag') ?? ''

  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [authorized, setAuthorized] = useState<boolean | null>(null) // null=checking
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const latestCreatedAt = useRef<string>('')

  // 初期ロード：認可チェック + メッセージ取得
  useEffect(() => {
    if (!roomTag) return
    let cancelled = false

    ;(async () => {
      const uid = localStorage.getItem('user_id')
      if (!uid) { setAuthorized(false); return }
      setMyUserId(uid)

      // タグ所有確認（#あり・なし両対応）
      const stripped = roomTag.replace(/^#+/, '')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tagRow } = await (supabase.from('tags') as any)
        .select('id')
        .eq('user_id', uid)
        .in('text', [stripped, `#${stripped}`])
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (cancelled) return
      if (!tagRow) { setAuthorized(false); return }
      setAuthorized(true)

      // メッセージ初回取得
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: msgs } = await (supabase.from('lottery_messages') as any)
        .select('id, sender_id, content, created_at')
        .eq('room_tag', stripped)
        .order('created_at', { ascending: true })

      if (cancelled) return
      const list = (msgs as Message[]) ?? []
      setMessages(list)
      if (list.length > 0) latestCreatedAt.current = list[list.length - 1].created_at
    })()

    return () => { cancelled = true }
  }, [roomTag])

  // ポーリング：新着メッセージのみ追記
  useEffect(() => {
    if (authorized !== true || !roomTag) return

    const stripped = roomTag.replace(/^#+/, '')
    const poll = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query = (supabase.from('lottery_messages') as any)
        .select('id, sender_id, content, created_at')
        .eq('room_tag', stripped)
        .order('created_at', { ascending: true })

      if (latestCreatedAt.current) {
        query.gt('created_at', latestCreatedAt.current)
      }

      const { data } = await query
      const newMsgs = (data as Message[]) ?? []
      if (newMsgs.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id))
          const fresh = newMsgs.filter(m => !existingIds.has(m.id))
          if (fresh.length === 0) return prev
          latestCreatedAt.current = fresh[fresh.length - 1].created_at
          return [...prev, ...fresh]
        })
      }
    }

    const timerId = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(timerId)
  }, [authorized, roomTag])

  // 新着時に最下部へスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    const content = input.trim()
    if (!content || !myUserId || !roomTag || sending) return
    setSending(true)
    setInput('')

    const stripped = roomTag.replace(/^#+/, '')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('lottery_messages') as any)
      .insert({ room_tag: stripped, sender_id: myUserId, content })
      .select('id, sender_id, content, created_at')
      .single()

    if (!error && data) {
      const row = data as Message
      setMessages(prev => (prev.some(m => m.id === row.id) ? prev : [...prev, row]))
      latestCreatedAt.current = row.created_at
    }
    setSending(false)
  }

  const displayTag = `#${roomTag.replace(/^#+/, '')}`

  // 認可チェック中
  if (authorized === null) {
    return (
      <div style={{ background: '#F5F0E8', maxWidth: 390, margin: '0 auto', minHeight: '100svh' }}>
        <p style={{ textAlign: 'center', paddingTop: 80, fontSize: 13, color: '#A09070' }}>確認中...</p>
      </div>
    )
  }

  // 非認可
  if (!authorized) {
    return (
      <div style={{
        background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
        minHeight: '100svh', padding: '24px 20px',
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8B6914', padding: 0, marginBottom: 24 }}
        >
          ‹ 戻る
        </button>
        <div style={{
          background: '#FFFFFF', borderRadius: 16, padding: '32px 20px', textAlign: 'center',
          border: '1px solid rgba(212,184,150,0.5)',
        }}>
          <p style={{ fontSize: 28, margin: '0 0 12px' }}>🔒</p>
          <p style={{ fontSize: 14, color: '#3B2F1E', margin: 0, lineHeight: 1.6 }}>
            このルームには入れません。<br />{displayTag} のタグが必要です。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100svh', maxWidth: 390, margin: '0 auto', background: '#F5F0E8',
    }}>
      {/* ヘッダー */}
      <div style={{
        flexShrink: 0, padding: '16px 20px',
        borderBottom: '1px solid #D4B896', background: '#F5F0E8',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8B6914', lineHeight: 1, padding: 0 }}
        >
          ‹
        </button>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>
            🔥 {displayTag}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(59,47,30,0.45)' }}>ロッタリールーム</p>
        </div>
      </div>

      {/* メッセージ一覧 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(59,47,30,0.35)', marginTop: 40 }}>
            まだメッセージはありません
          </p>
        )}
        {messages.map((msg, index) => {
          const mine = msg.sender_id === myUserId
          return (
            <div key={msg.id}>
              {shouldShowDateDivider(messages, index) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 8px' }}>
                  <div style={{ flex: 1, height: 0.5, background: 'rgba(139,105,20,0.2)' }} />
                  <span style={{ fontSize: 11, color: 'rgba(139,105,20,0.55)', whiteSpace: 'nowrap' }}>
                    {formatDateLabel(msg.created_at)}
                  </span>
                  <div style={{ flex: 1, height: 0.5, background: 'rgba(139,105,20,0.2)' }} />
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: mine ? 'flex-end' : 'flex-start',
                marginBottom: 12,
              }}>
                <div style={{
                  maxWidth: '72%', padding: '10px 14px',
                  borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: mine ? '#4A7C59' : '#FFFFFF',
                  color: mine ? '#F5F0E8' : '#3B2F1E',
                  border: mine ? 'none' : '1px solid #D4B896',
                  fontSize: 14, lineHeight: 1.5,
                }}>
                  <p style={{ margin: 0 }}>{msg.content}</p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 入力欄 */}
      <div style={{
        flexShrink: 0, padding: '10px 16px 28px',
        borderTop: '1px solid #D4B896', background: '#F5F0E8',
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend() }}
          placeholder="メッセージを入力..."
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 20,
            border: '1.5px solid #D4B896', outline: 'none',
            fontSize: 16, color: '#3B2F1E', background: '#FFFFFF',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            width: 38, height: 38, borderRadius: '50%', border: 'none',
            background: input.trim() && !sending ? '#4A7C59' : 'rgba(139,105,20,0.12)',
            color: input.trim() && !sending ? '#F5F0E8' : 'rgba(139,105,20,0.35)',
            fontSize: 16, cursor: input.trim() && !sending ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          ›
        </button>
      </div>
    </div>
  )
}

export default function LotteryRoomPage() {
  return (
    <Suspense fallback={null}>
      <LotteryRoomContent />
    </Suspense>
  )
}
