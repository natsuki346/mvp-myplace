'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QuestionCard } from '@/src/components/onboarding/QuestionCard'

type QuestionType = 'light' | 'shadow'

// Q1・Q2 → 光タグ / Q3・Q4 → 影タグ（complete ページ仕様に合わせる）
const QUESTIONS: { text: string; type: QuestionType }[] = [
  { text: 'あなたという人間を言葉にしてみて！',                                               type: 'light'  },
  { text: '自分が好きな○○は？思う存分挙げてみて！',                                          type: 'light'  },
  { text: '本当はこうありたい！みたいな理想像や自分はいる？そんな自分も言葉にしてみて！',       type: 'shadow' },
  { text: 'あまり人に言わないけど、抱いている本音や感情を吐き出してみて！',                    type: 'shadow' },
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
    } else {
      // 全質問完了 → sessionStorage に保存して確認画面へ
      const lightTags  = updated.filter(q => q.type === 'light' ).flatMap(q => q.tags)
      const shadowTags = updated.filter(q => q.type === 'shadow').flatMap(q => q.tags)
      sessionStorage.setItem('onboarding_tags', JSON.stringify({ lightTags, shadowTags }))
      router.push('/onboarding/complete')
    }
  }

  return (
    <QuestionCard
      key={currentIndex}
      questionNumber={currentIndex + 1}
      totalQuestions={QUESTIONS.length}
      questionText={QUESTIONS[currentIndex].text}
      onComplete={handleComplete}
    />
  )
}
