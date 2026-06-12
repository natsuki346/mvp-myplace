'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'

// ?step=N → 遷移先のマッピング
const STEP_DESTINATIONS: Record<number, string> = {
  1: '/onboarding',
  2: '/onboarding/garden-setup',
  3: '/canvas',
}

const DEFAULT_STEP = 3

export default function StepsPreviewPage() {
  const router = useRouter()
  const { step: tutorialStep, advanceStep } = useTutorialStep()
  const [queryStep, setQueryStep] = useState(DEFAULT_STEP)
  const [skipPopup, setSkipPopup] = useState(false)

  useEffect(() => {
    const s = parseInt(new URLSearchParams(window.location.search).get('step') ?? String(DEFAULT_STEP), 10)
    const resolved = [1, 2, 3].includes(s) ? s : DEFAULT_STEP
    setQueryStep(resolved)
    if (resolved === 2) {
      // step=2（→ガーデン設定画面）は、その先に表示される案内ポップアップと
      // 内容が重複するため、ポップアップを出さずそのまま遷移する
      setSkipPopup(true)
      router.push(STEP_DESTINATIONS[2])
    } else if (resolved === 3 && tutorialStep === 'step_cards') {
      // step=3（→ホーム画面）も、その先の「同じタネを持つ人がいる場所へ」ポップアップと
      // 内容が重複するため、ポップアップを出さずそのまま遷移する
      setSkipPopup(true)
      advanceStep('room_nav_arrow')
      router.push('/home')
    }
  }, [])

  const destination = (queryStep === 3 && tutorialStep === 'step_cards')
    ? '/home'
    : STEP_DESTINATIONS[queryStep]

  const handleStart = () => {
    if (queryStep === 3 && tutorialStep === 'step_cards') advanceStep('room_nav_arrow')
    router.push(destination)
  }

  if (skipPopup) {
    return <div style={{ height: '100svh', maxWidth: 390, margin: '0 auto', background: '#F5F0E8' }} />
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100svh', maxWidth: 390, margin: '0 auto',
        background: '#F5F0E8', padding: '0 24px',
      }}
    >
      <div style={{
        width: '100%', background: '#FFFFFF', borderRadius: 20,
        padding: 32, textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#3B2F1E', margin: 0 }}>
          まず4つの質問に答えてみよう🌱
        </h2>
        <p style={{ fontSize: 13, color: '#8B6914', margin: '8px 0 0' }}>
          あなたの実と根のタネが生まれます
        </p>
        <button
          onClick={handleStart}
          style={{
            width: '100%', padding: '14px', marginTop: 24,
            borderRadius: 24, border: 'none',
            background: '#4A7C59', color: '#FFFFFF',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          はじめる
        </button>
      </div>
    </div>
  )
}
