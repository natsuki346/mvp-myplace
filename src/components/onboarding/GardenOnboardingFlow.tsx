'use client'

import { useState } from 'react'
import WhyModal from './WhyModal'
import WelcomeModal from './WelcomeModal'
import SeedQuoteModal from '@/src/components/room/SeedQuoteModal'
import GardenIntroSlidesModal from '@/src/components/tutorial/GardenIntroSlidesModal'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import { GARDEN_ONBOARDING_QUOTE } from '@/src/constants/quotes'

type Stage = 'slides' | 'check' | 'quote' | 'welcome'

type GardenOnboardingFlowProps = {
  onClose: () => void
}

// ガーデンタブに初めて来たときの案内シーケンス：
// ガーデン説明スライド3枚（最後はバブルの中を開いた説明）→ ③「向き合い、成長する」チェックアニメ → ブッダの名言 → 歓迎モーダル
// ②「仲間と繋がる」のチェックは、この前のトークルーム訪問直後のプロセスモーダル（FirstChatVisitWelcomeFlow側）で済んでいる。
// この歓迎モーダルを閉じた時点でオンボーディングは完全終了（'completed'）。これより後の案内は一切存在しない。
export default function GardenOnboardingFlow({ onClose }: GardenOnboardingFlowProps) {
  const { advanceStep } = useTutorialStep()
  const [stage, setStage] = useState<Stage>('slides')

  const finish = () => {
    sessionStorage.removeItem('onboarding_seed_tag_id')
    advanceStep('completed')
    onClose()
  }

  return (
    <>
      {stage === 'slides' && (
        <GardenIntroSlidesModal onNext={() => setStage('check')} />
      )}

      {stage === 'check' && (
        <WhyModal
          completedStep={3}
          onCompletedCheckDone={() => setStage('quote')}
          onStart={() => setStage('quote')}
        />
      )}

      {stage === 'quote' && (
        <SeedQuoteModal
          fixedQuote={GARDEN_ONBOARDING_QUOTE}
          fixedPraise="人間はみな価値がある"
          zIndex={600}
          onClose={() => setStage('welcome')}
        />
      )}

      {stage === 'welcome' && (
        <WelcomeModal
          username={sessionStorage.getItem('username')}
          title={(() => {
            const u = sessionStorage.getItem('username')
            return u ? <>{u}さんの農園を<br />広げよう！</> : <>農園を<br />広げよう！</>
          })()}
          subtitle="あなたは常に前に進んでる"
          buttonText="続ける"
          onNext={finish}
        />
      )}
    </>
  )
}
