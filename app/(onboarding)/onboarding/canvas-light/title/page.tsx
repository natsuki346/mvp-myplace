'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'

export default function CanvasLightTitlePage() {
  const router    = useRouter()
  const [title,       setTitle]       = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const mountTime = useRef(Date.now())

  const isValid = title.trim().length > 0

  const handleComplete = async () => {
    if (!isValid || submitting) return
    setSubmitting(true)

    const trimmed  = title.trim()
    const duration = Math.round((Date.now() - mountTime.current) / 1000)
    const edited   = sessionStorage.getItem('light_canvas_edited') === 'true'

    // sessionStorage に保存
    sessionStorage.setItem('light_title',          trimmed)
    sessionStorage.setItem('light_title_duration', String(duration))

    // Supabase の users テーブルを更新（fire-and-forget）
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
      className="flex flex-col min-h-screen bg-white px-8"
      style={{ maxWidth: 390, margin: '0 auto' }}
    >
      {/* スキップボタン */}
      <div className="flex justify-end pt-5">
        <button
          onClick={handleSkip}
          className="text-sm"
          style={{ color: 'rgba(0,0,0,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
        >スキップ</button>
      </div>

      <div className="w-full flex flex-col justify-center flex-1 pb-16">
        <h1 className="text-black text-xl font-bold leading-snug mb-2">
          あなたの光を、<br />あなたの言葉で名前にしてください
        </h1>
        <p className="text-gray-400 text-xs mb-10">
          光のキャンバスに一言つけよう
        </p>

        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleComplete()}
          autoFocus
          className="w-full border-b-2 border-gray-200 focus:border-black outline-none text-lg text-black py-3 bg-transparent transition-colors"
          style={{ caretColor: 'black' }}
        />

        <button
          onClick={handleComplete}
          disabled={!isValid || submitting}
          className="w-full mt-10 py-4 rounded-full text-sm font-semibold transition-all"
          style={{
            background: isValid && !submitting ? '#1a1a1a' : 'rgba(0,0,0,0.10)',
            color:      isValid && !submitting ? 'white'   : 'rgba(0,0,0,0.28)',
            cursor:     isValid && !submitting ? 'pointer' : 'default',
          }}
        >
          {submitting ? '保存中...' : '完了'}
        </button>
      </div>
    </div>
  )
}
