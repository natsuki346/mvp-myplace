'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'

export default function CanvasShadowTitlePage() {
  const router   = useRouter()
  const [title,      setTitle]      = useState('')
  const [submitting, setSubmitting] = useState(false)
  const mountTime = useRef(Date.now())

  const isValid = title.trim().length > 0

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

    router.push('/canvas')
  }

  const handleSkip = () => {
    sessionStorage.setItem('shadow_title', '')
    router.push('/canvas')
  }

  return (
    <div
      className="flex flex-col min-h-screen px-8"
      style={{ background: '#1a1a2e', maxWidth: 390, margin: '0 auto' }}
    >
      {/* スキップボタン */}
      <div className="flex justify-end pt-5">
        <button
          onClick={handleSkip}
          className="text-sm"
          style={{ color: 'rgba(255,255,255,0.32)', background: 'none', border: 'none', cursor: 'pointer' }}
        >スキップ</button>
      </div>

      <div className="w-full flex flex-col justify-center flex-1 pb-16">
        <h1 className="text-white text-xl font-bold leading-snug mb-2">
          あなたの影を、<br />あなたの言葉で名前にしてください
        </h1>
        <p className="text-xs mb-10" style={{ color: 'rgba(255,255,255,0.38)' }}>
          影のキャンバスに一言つけよう
        </p>

        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleComplete()}
          autoFocus
          className="w-full py-3 text-lg bg-transparent outline-none"
          style={{
            borderBottom: '2px solid rgba(255,255,255,0.25)',
            color: 'white', caretColor: 'white',
          }}
          // フォーカス時にボーダー明るく（インラインでは難しいため暫定）
        />

        <button
          onClick={handleComplete}
          disabled={!isValid || submitting}
          className="w-full mt-10 py-4 rounded-full text-sm font-semibold transition-all"
          style={{
            background: isValid && !submitting ? 'white' : 'rgba(255,255,255,0.10)',
            color:      isValid && !submitting ? '#1a1a2e' : 'rgba(255,255,255,0.28)',
            cursor:     isValid && !submitting ? 'pointer' : 'default',
          }}
        >
          {submitting ? '保存中...' : '完了'}
        </button>
      </div>
    </div>
  )
}
