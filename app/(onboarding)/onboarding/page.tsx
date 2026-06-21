'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QuestionCard } from '@/src/components/onboarding/QuestionCard'
import { supabase } from '@/src/lib/supabase/client'
import { recordTagEvent } from '@/src/lib/supabase/events'
import { useGrowthStage } from '@/src/components/tree/useGrowthStage'
import TagConfirmScreen from '@/src/components/onboarding/TagConfirmScreen'

type QuestionType = 'light' | 'shadow'

// Q1・Q2 → 光タグ / Q3・Q4 → 影タグ
const QUESTIONS: { text: string; exampleTags: string[]; type: QuestionType }[] = [
  {
    text: '自分の好きなところ、思う存分出してみよう',
    exampleTags: ['優しい', '明るい', '粘り強い', '人の気持ちがわかる', '細かいことに気づける'],
    type: 'light',
  },
  {
    text: '自分がテンション上がる瞬間って、\nどんな時？',
    exampleTags: ['好きな音楽を聴いてる時', '友達と話してる時', '新しいことを始める時', '自然の中にいる時', '誰かに感謝された時', '好きなものに没頭してる時'],
    type: 'light',
  },
  {
    text: '自分ではわかってるけど\nあまり人に言わないこと、何かある？',
    exampleTags: ['恋人と別れそう', '親と喧嘩した', '転職したい', '結婚が不安', '仕事が辛い', '人間関係が苦手'],
    type: 'shadow',
  },
  {
    text: 'よく一人で悩んじゃうけど、\n誰にも吐き出してないもの——\n思うがままに出してみない？',
    exampleTags: ['実は恋人と別れたい', '実は孤独を感じてる', '実は友達との関係を切りたい', '実は怖いことがある', 'めっちゃ恋人が欲しい'],
    type: 'shadow',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentIndex,  setCurrentIndex]  = useState(0)
  const [showGrowthOverlay, setShowGrowthOverlay] = useState(false)
  const { setGrowthStage } = useGrowthStage()

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
        ...lightTags.map((text) => ({
          user_id: userId, text: text.replace(/^#+/, ''), type: 'light' as const,
          color:   '#F5D78E',
        })),
        ...shadowTags.map((text, i) => ({
          user_id: userId, text: text.replace(/^#+/, ''), type: 'shadow' as const,
          color:   '#D4B896',
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

    // 農園トップへ戻った際にルーム誘導チュートリアルが始まるようにステップを進める
    localStorage.setItem('whyme_tutorial_step', 'room_nav_arrow')

    setGrowthStage('sprout')
    setShowGrowthOverlay(true)
  }

  if (showGrowthOverlay) {
    const lightTags  = collectedTags.filter(q => q.type === 'light' ).flatMap(q => q.tags)
    const shadowTags = collectedTags.filter(q => q.type === 'shadow').flatMap(q => q.tags)
    return <TagConfirmScreen lightTags={lightTags} shadowTags={shadowTags} />
  }

  return (
    <QuestionCard
      key={currentIndex}
      questionNumber={currentIndex + 1}
      totalQuestions={QUESTIONS.length}
      questionText={QUESTIONS[currentIndex].text}
      exampleTags={QUESTIONS[currentIndex].exampleTags}
      addButtonText={currentIndex === 2 ? '+ これも自分' : currentIndex === 3 ? '+ 本当の自分' : undefined}
      onComplete={handleComplete}
    />
  )
}
