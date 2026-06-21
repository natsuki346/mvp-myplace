'use client'

import { useState } from 'react'
import WhyModal from './WhyModal'
import WelcomeModal from './WelcomeModal'
import SeedQuoteModal from '@/src/components/room/SeedQuoteModal'
import GardenNavArrow from '@/src/components/tutorial/GardenNavArrow'
import { WELCOME_QUOTE } from '@/src/constants/quotes'

type Stage = 'why' | 'quote' | 'welcome' | 'arrow'

// 初回チャット訪問を終えた直後の案内シーケンス：
// プロセスモーダル（①と同じ仕組みで②「仲間と繋がる」にチェックがつく）→ ゲーテの名言 → ようこそモーダル → ガーデンへの矢印案内
// 'arrow'段階ではstepを進めない（呼び出し元のRoomTabsPageがstepで表示を切り替えているため、
// ここでstepを進めると矢印が表示と同時に消えてしまう）。実際にガーデンタブをタップした
// タイミングでのstep遷移は呼び出し元（BottomNavのonGardenClick）が担う。
export default function FirstChatVisitWelcomeFlow() {
  const [stage, setStage] = useState<Stage>('why')

  return (
    <>
      {stage === 'why' && (
        <WhyModal
          currentStep={3}
          completedStep={2}
          onCompletedCheckDone={() => setStage('quote')}
          onStart={() => setStage('quote')}
        />
      )}

      {stage === 'quote' && (
        <SeedQuoteModal
          fixedQuote={WELCOME_QUOTE}
          fixedPraise="あなたは決して一人じゃない"
          zIndex={600}
          onClose={() => setStage('welcome')}
        />
      )}

      {stage === 'welcome' && (
        <WelcomeModal
          username={sessionStorage.getItem('username')}
          onNext={() => setStage('arrow')}
        />
      )}

      {stage === 'arrow' && <GardenNavArrow />}
    </>
  )
}
