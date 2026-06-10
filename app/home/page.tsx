'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import GardenDisplay from './garden-display'
import { BottomNav } from '@/src/components/BottomNav'
import { useTutorial } from '@/src/components/tutorial/useTutorial'
import TutorialOverlay from '@/src/components/tutorial/TutorialOverlay'
import { isRoomOnboardingDone } from '@/src/lib/onboarding'

export default function HomePage() {
  const router = useRouter()
  const { step, advanceStep } = useTutorial()
  // ルーム案内チュートリアルは、オンボーディングの完了モーダルが出た後に開始する
  const [roomOnboardingDone] = useState(isRoomOnboardingDone)
  const tutorialActive = roomOnboardingDone && step === 'point_room_nav'

  return (
    <div
      className="min-h-screen"
      style={{ background: '#F5F0E8', maxWidth: 390, margin: '0 auto', position: 'relative' }}
    >
      {/* ────────────────── ヘッダー ────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '44px 20px 12px',
      }}>
        <h1 style={{ fontSize: 19, fontWeight: 600, color: '#3B2F1E', margin: 0 }}>
          あなたの農園
        </h1>
        <button
          onClick={() => router.push('/onboarding/garden-setup')}
          aria-label="編集する"
          style={{
            width: 38, height: 38, borderRadius: '50%',
            border: 'none', background: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(139,115,85,0.18)',
          }}
        >
          ✏️
        </button>
      </div>

      {/* ────────────────── 農園表示 ────────────────── */}
      {/* paddingBottom: ボトムナビの高さ(80px) + 余裕分(40px) */}
      <div style={{ paddingBottom: 120 }}>
        <GardenDisplay />
      </div>

      <BottomNav onRoomClick={() => { if (tutorialActive) advanceStep('explain_mi_room') }} />

      {tutorialActive && <TutorialOverlay />}
    </div>
  )
}
