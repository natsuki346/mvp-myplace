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

export default function CanvasShadowTitlePage() {
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
      const parsed = JSON.parse(raw) as { shadowItems?: TagItem[] }
      setBgItems((parsed.shadowItems ?? []).filter(t => t.kind !== 'avatar'))
    } catch { /* フォールバック：背景なし */ }
  }, [])

  const handleComplete = async () => {
    if (!isValid || submitting) return
    setSubmitting(true)

    const trimmed  = title.trim()
    const duration = Math.round((Date.now() - mountTime.current) / 1000)
    const edited   = sessionStorage.getItem('shadow_canvas_edited') === 'true'

    sessionStorage.setItem('shadow_title',          trimmed)
    sessionStorage.setItem('shadow_title_duration', String(duration))

    const userId = sessionStorage.getItem('user_id')
    if (userId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(supabase.from('users') as any)
        .update({ shadow_title: trimmed, shadow_title_duration: duration, shadow_canvas_edited: edited })
        .eq('id', userId)
        .then(({ error }: { error: { message: string } | null }) => {
          if (error) console.error('shadow_title update error:', error.message)
        })
    }

    router.push('/home')
  }

  const handleSkip = () => {
    sessionStorage.setItem('shadow_title', '')
    router.push('/home')
  }

  return (
    <div
      style={{
        position: 'relative', height: '100svh',
        maxWidth: 390, margin: '0 auto',
        overflow: 'hidden',
        background: 'linear-gradient(160deg, #0d0c18 0%, #141428 55%, #1a1a30 100%)',
      }}
    >
      {/* ── 背景：影キャンバスのタグ（全画面・操作不可） ── */}
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
              background: toHsla(item.color, 0.22),
              color:      item.color,
              border:     `1.5px solid ${toHsla(item.color, 0.55)}`,
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
          background: 'rgba(20,20,40,0.80)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderRadius: 20,
          padding: '28px 24px 24px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
          border: '1px solid rgba(255,255,255,0.10)',
          zIndex: 10,
        }}
      >
        <h1
          style={{
            fontSize: 13, fontWeight: 700, lineHeight: 1.7,
            textAlign: 'center', color: 'white', marginBottom: 24,
          }}
        >
          あなたが向き合えた<br />根のキャンバスにも名前をつけてみよう👍
        </h1>

        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleComplete()}
          autoFocus
          style={{
            width: '100%', borderBottom: '2px solid rgba(255,255,255,0.25)',
            outline: 'none', fontSize: 18, color: 'white',
            padding: '8px 0', background: 'transparent', caretColor: 'white',
            boxSizing: 'border-box',
          }}
        />

        <button
          onClick={handleComplete}
          disabled={!isValid || submitting}
          style={{
            width: '100%', marginTop: 20, padding: '14px',
            borderRadius: 30, border: 'none', cursor: isValid && !submitting ? 'pointer' : 'default',
            background: isValid && !submitting ? 'white' : 'rgba(255,255,255,0.10)',
            color:      isValid && !submitting ? '#1a1a2e' : 'rgba(255,255,255,0.28)',
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
            fontSize: 13, color: 'rgba(255,255,255,0.35)',
          }}
        >
          スキップ
        </button>
      </div>
    </div>
  )
}
