'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { recordTagEvent } from '@/src/lib/supabase/events'

const MOCK_MESSAGES = [
  { id: 1, text: '誰にも言えないよね',                  time: '23:45', mine: false },
  { id: 2, text: 'ここだと正直になれる気がする',         time: '23:46', mine: false },
  { id: 3, text: '同じ気持ちの人がいてよかった',         time: '23:47', mine: true  },
  { id: 4, text: '一人じゃないって感じがする',           time: '23:48', mine: false },
  { id: 5, text: '話してくれてありがとう',               time: '23:49', mine: false },
]

export default function ShadowRoomChatPage() {
  const router = useRouter()
  const params = useParams<{ tag: string }>()
  const tag    = decodeURIComponent(params.tag ?? '')

  const [input, setInput] = useState('')

  // room_entered イベントを fire-and-forget で記録
  useEffect(() => {
    const userId = sessionStorage.getItem('user_id')
    if (!userId || !tag) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('tags') as any)
      .select('id')
      .eq('user_id', userId)
      .eq('text', tag)
      .maybeSingle()
      .then(({ data }: { data: { id: string } | null }) => {
        if (data?.id) recordTagEvent(data.id, userId, 'room_entered')
      })
  }, [tag])

  return (
    <div
      className="flex flex-col"
      style={{ height: '100svh', maxWidth: 390, margin: '0 auto', background: '#1a1a2e' }}
    >

      {/* Header */}
      <div style={{
        flexShrink: 0, padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => {
            router.push('/room/shadow')
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}
        >‹</button>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'white' }}>
            {tag} の部屋
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.32)' }}>🌙 影の部屋</p>
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
              background: msg.mine ? 'rgba(167,139,250,0.85)' : 'rgba(255,255,255,0.08)',
              color: 'white',
              fontSize: 14, lineHeight: 1.5,
            }}>
              <p style={{ margin: 0 }}>{msg.text}</p>
              <p style={{ margin: '4px 0 0', fontSize: 10, opacity: 0.45, textAlign: 'right' }}>{msg.time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{
        flexShrink: 0, padding: '10px 16px 28px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', gap: 10, alignItems: 'center',
        background: '#1a1a2e',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="メッセージを入力..."
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 20,
            border: '1.5px solid rgba(255,255,255,0.12)', outline: 'none',
            fontSize: 14, color: 'white',
            background: 'rgba(255,255,255,0.06)',
          }}
        />
        <button
          onClick={() => setInput('')}
          style={{
            width: 38, height: 38, borderRadius: '50%', border: 'none',
            background: input.trim() ? 'rgba(167,139,250,0.85)' : 'rgba(255,255,255,0.08)',
            color: input.trim() ? 'white' : 'rgba(255,255,255,0.25)',
            fontSize: 16, cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >›</button>
      </div>

    </div>
  )
}
