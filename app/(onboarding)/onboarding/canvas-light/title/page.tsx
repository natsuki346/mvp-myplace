'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'

type TagItem = {
  id:      string
  kind?:   'tag' | 'avatar'
  content: string
  x:       number
  y:       number
  color:   string
}

function toHsla(hsl: string, alpha: number): string {
  return hsl.replace(/^hsl\(/, 'hsla(').replace(/\)$/, `,${alpha})`)
}

export default function CanvasLightTitlePage() {
  const router = useRouter()
  const [title,      setTitle]      = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bgItems,    setBgItems]    = useState<TagItem[]>([])
  const mountTime = useRef(Date.now())

  const isValid = title.trim().length > 0

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('onboarding_tags')
      if (!raw) return
      const parsed = JSON.parse(raw) as { lightItems?: TagItem[] }
      setBgItems((parsed.lightItems ?? []).filter(t => t.kind !== 'avatar'))
    } catch { /* フォールバック：背景なし */ }
  }, [])

  const handleComplete = async () => {
    if (!isValid || submitting) return
    setSubmitting(true)

    const trimmed  = title.trim()
    const duration = Math.round((Date.now() - mountTime.current) / 1000)
    const edited   = sessionStorage.getItem('light_canvas_edited') === 'true'

    sessionStorage.setItem('light_title',          trimmed)
    sessionStorage.setItem('light_title_duration', String(duration))

    const userId = sessionStorage.getItem('user_id')
    if (userId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(supabase.from('users') as any)
        .update({ light_title: trimmed, light_title_duration: duration, light_canvas_edited: edited })
        .eq('id', userId)
        .then(({ error }: { error: { message: string } | null }) => {
          if (error) console.error('light_title update error:', error.message)
        })
    }

    router.push('/onboarding/canvas-shadow')
  }

  const handleSkip = () => {
    sessionStorage.setItem('light_title', '')
    router.push('/onboarding/canvas-shadow')
  }

  return (
    <div
      style={{
        position: 'relative', height: '100svh',
        maxWidth: 390, margin: '0 auto',
        overflow: 'hidden', background: 'white',
      }}
    >
      {/* ── 背景：光キャンバスのタグ（全画面・操作不可） ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {bgItems.map(item => (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              left:      `${item.x}%`, top: `${item.y}%`,
              transform: 'translate(-50%, -50%)',
              userSelect: 'none',
            }}
          >
            <span style={{
              display: 'block',
              fontSize: 14, fontWeight: 600, lineHeight: 1.5,
              padding: '4px 12px', borderRadius: 12, whiteSpace: 'nowrap',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              background: toHsla(item.color, 0.12),
              color:      item.color,
              border:     `1.5px solid ${toHsla(item.color, 0.38)}`,
            }}>{item.content}</span>
          </div>
        ))}
      </div>

      {/* ── 入力カード（中央浮遊） ── */}
      <div
        style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'calc(100% - 48px)', maxWidth: 320,
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderRadius: 20,
          padding: '28px 24px 24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
          border: '1px solid rgba(255,255,255,0.9)',
          zIndex: 10,
        }}
      >
        <h1
          style={{
            fontSize: 16, fontWeight: 700, lineHeight: 1.6,
            textAlign: 'center', color: '#1a1a1a', marginBottom: 24,
          }}
        >
          あなたが広げた<br />実のキャンバスに名前をつけよう！
        </h1>

        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleComplete()}
          autoFocus
          style={{
            width: '100%', borderBottom: '2px solid rgba(0,0,0,0.15)',
            outline: 'none', fontSize: 18, color: '#1a1a1a',
            padding: '8px 0', background: 'transparent', caretColor: '#1a1a1a',
            boxSizing: 'border-box',
          }}
        />

        <button
          onClick={handleComplete}
          disabled={!isValid || submitting}
          style={{
            width: '100%', marginTop: 20, padding: '14px',
            borderRadius: 30, border: 'none', cursor: isValid && !submitting ? 'pointer' : 'default',
            background: isValid && !submitting ? '#1a1a1a' : 'rgba(0,0,0,0.10)',
            color:      isValid && !submitting ? 'white'   : 'rgba(0,0,0,0.28)',
            fontSize: 14, fontWeight: 700, transition: 'all 0.15s',
          }}
        >
          {submitting ? '保存中...' : '完了'}
        </button>

        <button
          onClick={handleSkip}
          style={{
            width: '100%', marginTop: 10, padding: '10px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'rgba(0,0,0,0.35)',
          }}
        >
          スキップ
        </button>
      </div>
    </div>
  )
}
