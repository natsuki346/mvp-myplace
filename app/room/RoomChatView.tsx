'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { getMatchingTags, incrementGrowthPoint, creditDailyView } from '@/src/lib/supabase/rooms'

type Message = { id: string; tag_id: string; user_id: string; content: string; created_at: string }

const THEME = {
  light: {
    bg: '#ffffff', headerBorder: 'rgba(0,0,0,0.08)', text: '#1a1a1a',
    sub: 'rgba(0,0,0,0.35)', back: 'rgba(0,0,0,0.4)',
    mineBg: '#1a1a1a', mineText: '#ffffff',
    otherBg: 'rgba(0,0,0,0.06)', otherText: '#1a1a1a',
    inputBorder: 'rgba(0,0,0,0.12)', inputBg: 'rgba(0,0,0,0.03)',
    sendActive: '#1a1a1a', sendInactiveBg: 'rgba(0,0,0,0.10)', sendInactiveText: 'rgba(0,0,0,0.3)',
    icon: '☀️', label: '実の部屋', backHref: '/onboarding/room-visit/light',
  },
  shadow: {
    bg: '#1a1a2e', headerBorder: 'rgba(255,255,255,0.07)', text: '#ffffff',
    sub: 'rgba(255,255,255,0.32)', back: 'rgba(255,255,255,0.35)',
    mineBg: 'rgba(167,139,250,0.85)', mineText: '#ffffff',
    otherBg: 'rgba(255,255,255,0.08)', otherText: '#ffffff',
    inputBorder: 'rgba(255,255,255,0.12)', inputBg: 'rgba(255,255,255,0.06)',
    sendActive: 'rgba(167,139,250,0.85)', sendInactiveBg: 'rgba(255,255,255,0.08)', sendInactiveText: 'rgba(255,255,255,0.25)',
    icon: '🌙', label: '根の部屋', backHref: '/onboarding/room-visit/shadow',
  },
} as const

export default function RoomChatView({ type }: { type: 'light' | 'shadow' }) {
  const router = useRouter()
  const params = useParams<{ tag: string }>()
  const tag = decodeURIComponent(params.tag ?? '')
  const theme = THEME[type]

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [ownTagId, setOwnTagId] = useState<string | null>(null)

  const matchingIdsRef = useRef<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const uid = sessionStorage.getItem('user_id')
      if (!uid || !tag) { setLoading(false); return }
      setUserId(uid)

      // 自分のタグ行を取得（投稿・growth_point の対象）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: own } = await (supabase.from('tags') as any)
        .select('id')
        .eq('user_id', uid)
        .eq('text', tag)
        .eq('type', type)
        .maybeSingle()

      const ownId = (own as { id: string } | null)?.id ?? null
      if (cancelled) return
      setOwnTagId(ownId)

      // ルーム閲覧クレジット（1日1回まで growth_point +1）
      if (ownId) creditDailyView(ownId, uid)

      // 同じタグを持つ全ユーザーのタグ範囲を取得
      const matches = await getMatchingTags(tag, type)
      const ids = matches.map(m => m.id)
      matchingIdsRef.current = new Set(ids)

      if (ids.length === 0) {
        if (!cancelled) { setMessages([]); setLoading(false) }
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: msgs } = await (supabase.from('messages') as any)
        .select('id, tag_id, user_id, content, created_at')
        .in('tag_id', ids)
        .order('created_at', { ascending: true })

      if (!cancelled) { setMessages((msgs as Message[]) ?? []); setLoading(false) }
    })()

    // Realtime購読
    const channel = supabase
      .channel(`messages-${type}-${tag}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const row = payload.new as Message
        if (!matchingIdsRef.current.has(row.tag_id)) return
        setMessages(prev => (prev.some(m => m.id === row.id) ? prev : [...prev, row]))
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [tag, type])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    const content = input.trim()
    const uid = sessionStorage.getItem('user_id')
    if (!content || !uid || !ownTagId) return
    setInput('')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('messages') as any)
      .insert([{ tag_id: ownTagId, user_id: uid, content }])
      .select('id, tag_id, user_id, content, created_at')
      .single()

    if (!error && data) {
      const row = data as Message
      setMessages(prev => (prev.some(m => m.id === row.id) ? prev : [...prev, row]))
    }
    incrementGrowthPoint(ownTagId)
  }

  return (
    <div className="flex flex-col" style={{ height: '100svh', maxWidth: 390, margin: '0 auto', background: theme.bg }}>

      {/* Header */}
      <div style={{
        flexShrink: 0, padding: '16px 20px',
        borderBottom: `1px solid ${theme.headerBorder}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => router.push(theme.backHref)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: theme.back, lineHeight: 1 }}
        >‹</button>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: theme.text }}>
            {tag} の部屋
          </p>
          <p style={{ margin: 0, fontSize: 11, color: theme.sub }}>{theme.icon} {theme.label}</p>
        </div>
      </div>

      {/* Messages（匿名表示：名前・アイコンなし） */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
        {loading ? (
          <p className="text-sm text-center" style={{ color: theme.sub }}>読み込み中...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-center" style={{ color: theme.sub }}>まだメッセージはありません</p>
        ) : messages.map(msg => {
          const mine = msg.user_id === userId
          return (
            <div
              key={msg.id}
              style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 12 }}
            >
              <div style={{
                maxWidth: '72%',
                padding: '10px 14px',
                borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: mine ? theme.mineBg : theme.otherBg,
                color: mine ? theme.mineText : theme.otherText,
                fontSize: 14, lineHeight: 1.5,
              }}>
                <p style={{ margin: 0 }}>{msg.content}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        flexShrink: 0, padding: '10px 16px 28px',
        borderTop: `1px solid ${theme.headerBorder}`,
        display: 'flex', gap: 10, alignItems: 'center',
        background: theme.bg,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
          placeholder="メッセージを入力..."
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 20,
            border: `1.5px solid ${theme.inputBorder}`, outline: 'none',
            fontSize: 14, color: theme.text,
            background: theme.inputBg,
          }}
        />
        <button
          onClick={handleSend}
          style={{
            width: 38, height: 38, borderRadius: '50%', border: 'none',
            background: input.trim() ? theme.sendActive : theme.sendInactiveBg,
            color: input.trim() ? '#fff' : theme.sendInactiveText,
            fontSize: 16, cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >›</button>
      </div>

    </div>
  )
}
