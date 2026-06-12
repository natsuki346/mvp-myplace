'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/src/lib/supabase/client'
import { getMatchingTags, incrementGrowthPoint } from '@/src/lib/supabase/rooms'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import { formatHashtag } from '@/app/onboarding/garden-setup/garden-visuals'
import { DUMMY_MESSAGES, DUMMY_MESSAGES_VIEWONLY } from './dummy-messages'

type Message = { id: string; user_id: string; content: string }
type RoomType = 'light' | 'shadow'

const THEME: Record<RoomType, { icon: string; accent: string }> = {
  light:  { icon: '🍅', accent: '#4A7C59' },
  shadow: { icon: '🌱', accent: '#8B6914' },
}

export default function RoomChatSheet({
  type,
  tagId,
  tagText,
  subTagId = null,
  subTagName = null,
  onClose,
  onMessageSent,
}: {
  type:       RoomType
  tagId:      string
  tagText:    string
  subTagId?:  string | null
  subTagName?: string | null
  onClose:    () => void
  onMessageSent?: () => void
}) {
  const [visible, setVisible]   = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [userId] = useState<string | null>(() => sessionStorage.getItem('user_id'))
  const bottomRef = useRef<HTMLDivElement>(null)
  const theme = THEME[type]
  const dummyMessages = DUMMY_MESSAGES[type]
  const { step } = useTutorialStep()
  const viewOnly = (type === 'light' && step === 'room_chat_mi') || (type === 'shadow' && step === 'room_chat_ne')

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    // 入室のたびに growth_point を +1（閲覧モードは対象外。チュートリアルでは閉じた時に加算する）
    if (!viewOnly) incrementGrowthPoint(tagId)

    let cancelled = false
    ;(async () => {
      const matches = await getMatchingTags(tagText, type)
      const ids = matches.map(m => m.id)
      if (ids.length === 0) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase.from('messages') as any)
        .select('id, user_id, content')
        .in('tag_id', ids)
        .order('created_at', { ascending: true })

      query = subTagId ? query.eq('sub_tag_id', subTagId) : query.is('sub_tag_id', null)

      const { data } = await query

      if (!cancelled) setMessages((data as Message[]) ?? [])
    })()

    return () => { cancelled = true }
  }, [tagId, tagText, type, subTagId, viewOnly])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const handleSend = async () => {
    const content = input.trim()
    if (!content || !userId) return
    setInput('')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('messages') as any)
      .insert([{ tag_id: tagId, user_id: userId, content, sub_tag_id: subTagId }])
      .select('id, user_id, content')
      .single()

    if (!error && data) {
      const row = data as Message
      setMessages(prev => [...prev, row])
      onMessageSent?.()
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: viewOnly ? 'stretch' : 'flex-end', justifyContent: 'center' }}>
      {/* 背景オーバーレイ（全画面表示時は不要） */}
      {!viewOnly && (
        <div
          onClick={close}
          style={{
            position: 'absolute', inset: 0,
            background: visible ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
            transition: 'background 0.3s ease',
          }}
        />
      )}

      {/* シート本体（通常：下からスライドアップ／閲覧モード：全画面） */}
      <div
        className="flex flex-col"
        style={viewOnly ? {
          position: 'relative', width: '100%', maxWidth: 390, height: '100%',
          background: '#F5F0E8',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease',
          overflow: 'hidden',
        } : {
          position: 'relative', width: '100%', maxWidth: 390, height: '82vh',
          background: '#FFFFFF', borderRadius: '24px 24px 0 0',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s ease',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          flexShrink: 0, padding: '16px 20px',
          borderBottom: viewOnly ? '1px solid rgba(59,47,30,0.08)' : '1px solid rgba(0,0,0,0.08)',
          background: viewOnly ? '#F5F0E8' : undefined,
          display: 'flex', alignItems: 'center',
          justifyContent: viewOnly ? 'flex-start' : 'space-between',
          gap: viewOnly ? 12 : 0,
        }}>
          {viewOnly ? (
            <>
              <button
                onClick={close}
                style={{ background: 'none', border: 'none', fontSize: 15, color: '#3B2F1E', cursor: 'pointer', padding: 0, flexShrink: 0 }}
              >← 戻る</button>
              {visible && (
                <span
                  style={{
                    fontSize: 11, background: '#FEE2E2', color: '#DC2626',
                    borderRadius: 12, padding: '3px 10px', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >読んだら戻ろう</span>
              )}
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>
                {formatHashtag(tagText)}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 18 }}>{theme.icon}</span>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>
                  {subTagId ? `#${subTagName}` : tagText}
                </p>
              </div>
              <button
                onClick={close}
                style={{ background: 'none', border: 'none', fontSize: 22, color: 'rgba(0,0,0,0.35)', cursor: 'pointer', lineHeight: 1 }}
              >×</button>
            </>
          )}
        </div>

        {/* チュートリアル：閲覧モードバッジ */}
        {viewOnly && (
          <div style={{ flexShrink: 0, padding: '6px 16px', background: '#D4B896', textAlign: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#3B2F1E' }}>👀 閲覧モード</span>
          </div>
        )}

        {/* Messages（匿名表示：名前・アイコンなし） */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {!subTagId && viewOnly && DUMMY_MESSAGES_VIEWONLY[type].map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
              <div style={{
                maxWidth: '72%', padding: '10px 14px',
                borderRadius: 12,
                background: '#EFEFEF',
                color: '#3B2F1E',
                fontSize: 14, lineHeight: 1.5,
              }}>
                <p style={{ margin: 0 }}>{m.content}</p>
              </div>
            </div>
          ))}

          {!subTagId && !viewOnly && dummyMessages.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
              <div style={{
                maxWidth: '72%', padding: '10px 14px',
                borderRadius: m.mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: m.mine ? theme.accent : 'rgba(0,0,0,0.06)',
                color: m.mine ? '#FFFFFF' : '#3B2F1E',
                fontSize: 14, lineHeight: 1.5,
              }}>
                <p style={{ margin: 0 }}>{m.content}</p>
              </div>
            </div>
          ))}

          {messages.map(msg => {
            const mine = msg.user_id === userId
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                <div style={{
                  maxWidth: '72%', padding: '10px 14px',
                  borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: mine ? theme.accent : 'rgba(0,0,0,0.06)',
                  color: mine ? '#FFFFFF' : '#3B2F1E',
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
        {!viewOnly && (
          <div style={{
            flexShrink: 0, padding: '10px 16px 20px',
            borderTop: '1px solid rgba(0,0,0,0.08)',
            display: 'flex', gap: 10, alignItems: 'center',
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
              placeholder="メッセージを入力..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 20,
                border: '1.5px solid rgba(0,0,0,0.12)', outline: 'none',
                fontSize: 14, color: '#3B2F1E', background: 'rgba(0,0,0,0.03)',
              }}
            />
            <button
              onClick={handleSend}
              style={{
                width: 38, height: 38, borderRadius: '50%', border: 'none',
                background: input.trim() ? theme.accent : 'rgba(0,0,0,0.10)',
                color: input.trim() ? '#fff' : 'rgba(0,0,0,0.3)',
                fontSize: 16, cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >›</button>
          </div>
        )}
      </div>
    </div>
  )
}
