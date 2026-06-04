'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QuestionCard } from '@/src/components/onboarding/QuestionCard'
import { supabase } from '@/src/lib/supabase/client'
import { recordTagEvent } from '@/src/lib/supabase/events'

type QuestionType = 'light' | 'shadow'

// Q1・Q2 → 光タグ / Q3・Q4 → 影タグ
const QUESTIONS: { text: string; subText?: string; type: QuestionType }[] = [
  { text: 'あなたという人間を言葉にしてみて！',                                             type: 'light'  },
  { text: '自分が好きな○○は？思う存分挙げてみて！',
    subText: '例）アーティスト、食べ物、場所など、自分が好きなものを思う存分挙げてみて！',    type: 'light'  },
  { text: '本当はこうありたい！みたいな理想像や自分はいる？そんな自分も言葉にしてみて！',     type: 'shadow' },
  { text: 'あまり人に言わないけど、抱いている本音や感情を吐き出してみて！',                  type: 'shadow' },
]

// タグの初期配置座標（fraction 0–1）
const SPREAD = [
  { x: 0.14, y: 0.14 }, { x: 0.55, y: 0.11 }, { x: 0.22, y: 0.34 },
  { x: 0.64, y: 0.32 }, { x: 0.10, y: 0.54 }, { x: 0.50, y: 0.56 },
  { x: 0.20, y: 0.74 }, { x: 0.66, y: 0.70 }, { x: 0.38, y: 0.84 },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentIndex,  setCurrentIndex]  = useState(0)
  const [collectedTags, setCollectedTags] = useState<{ tags: string[]; type: QuestionType }[]>([])

  const handleComplete = (tags: string[]) => {
    const updated = [...collectedTags, { tags, type: QUESTIONS[currentIndex].type }]
    setCollectedTags(updated)

    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex(prev => prev + 1)
      return
    }

    // ── Q4 完了：全タグを DB に保存してキャンバス編集へ ──────────────────────
    const lightTags  = updated.filter(q => q.type === 'light' ).flatMap(q => q.tags)
    const shadowTags = updated.filter(q => q.type === 'shadow').flatMap(q => q.tags)

    // sessionStorage に保存（canvas-light / canvas-shadow ページが参照）
    sessionStorage.setItem('onboarding_tags', JSON.stringify({ lightTags, shadowTags }))

    // DB 保存は fire-and-forget（遷移をブロックしない）
    const userId = sessionStorage.getItem('user_id')
    if (userId) {
      const allTags = [
        ...lightTags.map((text, i) => ({
          user_id:    userId, text, type: 'light' as const,
          color:      'hsl(270,60%,45%)',
          position_x: SPREAD[i % SPREAD.length].x,
          position_y: SPREAD[i % SPREAD.length].y,
        })),
        ...shadowTags.map((text, i) => ({
          user_id:    userId, text, type: 'shadow' as const,
          color:      'hsl(270,60%,70%)',
          position_x: SPREAD[i % SPREAD.length].x,
          position_y: SPREAD[i % SPREAD.length].y,
        })),
      ]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(supabase.from('tags').insert(allTags as any).select('id') as any)
        .then((result: { data: { id: string }[] | null; error: { message: string } | null }) => {
          if (result.error) { console.error('tags save failed:', result.error.message); return }
          result.data?.forEach(row => recordTagEvent(row.id, userId, 'registered'))
        })
    }

    router.push('/onboarding/canvas-light')
  }

  return (
    <QuestionCard
      key={currentIndex}
      questionNumber={currentIndex + 1}
      totalQuestions={QUESTIONS.length}
      questionText={QUESTIONS[currentIndex].text}
      questionSubText={QUESTIONS[currentIndex].subText}
      onComplete={handleComplete}
    />
  )
}
