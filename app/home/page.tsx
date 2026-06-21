'use client'

import GardenDisplay from './garden-display'
import { BottomNav } from '@/src/components/BottomNav'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import RoomNavArrow from '@/src/components/tutorial/RoomNavArrow'
import GardenOnboardingFlow from '@/src/components/onboarding/GardenOnboardingFlow'

export default function HomePage() {
  const { step, advanceStep } = useTutorialStep()

  return (
    <div
      style={{
        background: '#F5F0E8', maxWidth: 390, margin: '0 auto', position: 'relative',
        height: '100svh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
    >
      {/* ────────────────── ガーデン表示 ────────────────── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 80 }}>
        <GardenDisplay />
      </div>

      <BottomNav onRoomClick={() => { if (step === 'room_nav_arrow') advanceStep('room_intro') }} />

      {step === 'room_nav_arrow' && <RoomNavArrow />}

      {step === 'garden_onboarding' && (
        <GardenOnboardingFlow onClose={() => {}} />
      )}
    </div>
  )
}
