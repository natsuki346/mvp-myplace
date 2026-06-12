'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QuestionCard } from '@/src/components/onboarding/QuestionCard'
import { supabase } from '@/src/lib/supabase/client'
import { recordTagEvent } from '@/src/lib/supabase/events'

type QuestionType = 'light' | 'shadow'

// Q1・Q2 → 光タグ / Q3・Q4 → 影タグ
const QUESTIONS: { text: string; subText?: string; type: QuestionType }[] = [
  {
    text: '自分の好きなところ、思う存分出してみよう',
    subText: '例）優しい・明るい・粘り強い・人の気持ちがわかる\n細かいことに気づけるなど',
    type: 'light',
  },
  {
    text: '自分がテンション上がる瞬間って、\nどんな時？',
    subText: '例）好きな音楽を聴いてる時・友達と話してる時\n新しいことを始める時・自然の中にいる時\n誰かに感謝された時・好きなものに没頭してる時など',
    type: 'light',
  },
  {
    text: '自分ではわかってるけど\nあまり人に言わないこと、何かある？',
    subText: '例）恋愛のこと・家族のこと・お金のこと・将来のこと・仕事のこと・人間関係のことなど',
    type: 'shadow',
  },
  {
    text: 'よく一人で悩んじゃうけど、\n誰にも吐き出してないもの——\n思うがままに出してみない？',
    subText: '例）実は恋人が欲しい・実は孤独を感じてる\n実は誰かに認められたい・実は怖いことがあるなど',
    type: 'shadow',
  },
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

  // オンボーディング開始時にチュートリアル表示フラグをリセット（毎回表示）
  useEffect(() => {
    sessionStorage.removeItem('canvas_tutorial_shown_light')
    sessionStorage.removeItem('canvas_tutorial_shown_shadow')
  }, [])
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

    // Q3（軽い種）・Q4（重い種）の順で並ぶ前提で seed_weight を割り当てる
    const shadowGroups = updated.filter(q => q.type === 'shadow').map(q => q.tags)
    const shadowTags = shadowGroups.flat()
    const shadowSeedWeights = shadowGroups.flatMap((tags, qi) =>
      tags.map(() => (qi === 0 ? 'light' as const : 'heavy' as const))
    )

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
          seed_weight: shadowSeedWeights[i],
        })),
      ]
      const insertTags = (rows: unknown[]) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('tags').insert(rows as any).select('id') as any) as Promise<{
          data: { id: string }[] | null
          error: { message: string } | null
        }>

      insertTags(allTags).then(result => {
        if (result.error) {
          // seed_weight/stage が未マイグレーション環境では、それらを除いて再試行する
          if (result.error.message.includes('seed_weight') || result.error.message.includes('stage')) {
            const fallbackTags = allTags.map(tag => {
              const copy: Record<string, unknown> = { ...tag }
              delete copy.seed_weight
              delete copy.stage
              return copy
            })
            insertTags(fallbackTags).then(retry => {
              if (retry.error) { console.error('tags save failed:', retry.error.message); return }
              retry.data?.forEach(row => recordTagEvent(row.id, userId, 'registered'))
            })
            return
          }
          console.error('tags save failed:', result.error.message)
          return
        }
        result.data?.forEach(row => recordTagEvent(row.id, userId, 'registered'))
      })
    }

    router.push('/onboarding/steps-preview?step=2')
  }

  return (
    <QuestionCard
      key={currentIndex}
      questionNumber={currentIndex + 1}
      totalQuestions={QUESTIONS.length}
      questionText={QUESTIONS[currentIndex].text}
      questionSubText={QUESTIONS[currentIndex].subText}
      addButtonText={currentIndex === 2 ? '+ これも自分' : currentIndex === 3 ? '+ 本当の自分' : undefined}
      onComplete={handleComplete}
    />
  )
}
