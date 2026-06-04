'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

const MOCK_MESSAGES = [
  { id: 1, text: '同じ気持ちの人がいてうれしい',      time: '12:34', mine: false },
  { id: 2, text: 'ここで語り合いたい！',               time: '12:35', mine: false },
  { id: 3, text: 'ずっとこういう場所が欲しかった',    time: '12:36', mine: false },
  { id: 4, text: 'わかる！ほんとそれ',                  time: '12:37', mine: true  },
  { id: 5, text: 'ここに来てよかった',                  time: '12:38', mine: false },
]

export default function LightRoomChatPage() {
  const router = useRouter()
  const params = useParams<{ tag: string }>()
  const tag    = decodeURIComponent(params.tag ?? '')

  const [input, setInput] = useState('')

  return (
    <div
      className="flex flex-col bg-white"
      style={{ height: '100svh', maxWidth: 390, margin: '0 auto' }}
    >

      {/* Header */}
      <div style={{
        flexShrink: 0, padding: '16px 20px',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => {
            sessionStorage.setItem('show_shadow_modal', 'true')
            router.push('/canvas')
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'rgba(0,0,0,0.4)', lineHeight: 1 }}
        >‹</button>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>
            {tag} の部屋
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(0,0,0,0.35)' }}>☀️ 光の部屋</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
        {MOCK_MESSAGES.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.mine ? 'flex-end' : 'flex-start',
              marginBottom: 12,
            }}
          >
            <div style={{
              maxWidth: '72%',
              padding: '10px 14px',
              borderRadius: msg.mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.mine ? '#1a1a1a' : 'rgba(0,0,0,0.06)',
              color: msg.mine ? 'white' : '#1a1a1a',
              fontSize: 14, lineHeight: 1.5,
            }}>
              <p style={{ margin: 0 }}>{msg.text}</p>
              <p style={{ margin: '4px 0 0', fontSize: 10, opacity: 0.5, textAlign: 'right' }}>{msg.time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{
        flexShrink: 0, padding: '10px 16px 28px',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        display: 'flex', gap: 10, alignItems: 'center',
        background: 'white',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="メッセージを入力..."
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 20,
            border: '1.5px solid rgba(0,0,0,0.12)', outline: 'none',
            fontSize: 14, color: '#1a1a1a',
            background: 'rgba(0,0,0,0.03)',
          }}
        />
        <button
          onClick={() => setInput('')}
          style={{
            width: 38, height: 38, borderRadius: '50%', border: 'none',
            background: input.trim() ? '#1a1a1a' : 'rgba(0,0,0,0.10)',
            color: input.trim() ? 'white' : 'rgba(0,0,0,0.3)',
            fontSize: 16, cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >›</button>
      </div>

    </div>
  )
}
