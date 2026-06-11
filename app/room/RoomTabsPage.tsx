'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LightRoomView from './LightRoomView'
import ShadowRoomView from './ShadowRoomView'
import { BottomNav } from '@/src/components/BottomNav'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import RoomExplainFlow from '@/src/components/tutorial/RoomExplainFlow'
import WateringAnimation from '@/src/components/tutorial/WateringAnimation'
import GrowthModal from '@/src/components/tutorial/GrowthModal'
import ThanksModal from './ThanksModal'
import { creditAllShadowTags } from '@/src/lib/supabase/rooms'

type RoomType = 'light' | 'shadow'

const TAB_ORDER: RoomType[] = ['light', 'shadow']

const TAB_CONFIG: Record<RoomType, { label: string; icon: string }> = {
  light:  { label: '実の部屋', icon: '🍅' },
  shadow: { label: '根の部屋', icon: '🌱' },
}

const ACTIVE_BG   = '#4A7C59'
const INACTIVE_BG = '#C4B49A'

type TutorialPhase = 'explain_light' | 'explain_shadow' | 'watering' | 'growth' | 'thanks' | null

export default function RoomTabsPage({ type }: { type: RoomType }) {
  const router = useRouter()
  const { step, advanceStep } = useTutorialStep()

  const [growthShown, setGrowthShown] = useState(false)
  const [thanksShown, setThanksShown] = useState(false)

  const phase: TutorialPhase =
    step === 'room_explain' ? 'explain_light'
    : step === 'room_explain_shadow' ? 'explain_shadow'
    : step === 'watering'
      ? (thanksShown ? 'thanks' : growthShown ? 'growth' : 'watering')
      : null

  const handleTabClick = (t: RoomType) => {
    router.replace(`/room/${t}`)
  }

  const handleGrowthStart = () => {
    ;(async () => {
      const userId = typeof window !== 'undefined' ? sessionStorage.getItem('user_id') : null
      if (userId) await creditAllShadowTags(userId)
      setThanksShown(true)
    })()
  }

  return (
    <div
      className="min-h-screen px-6 pt-12"
      style={{ background: '#F5F0E8', maxWidth: 390, margin: '0 auto', paddingBottom: 120 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: 22 }}>{TAB_CONFIG[type].icon}</span>
        <h1 className="text-xl font-bold" style={{ color: '#3B2F1E' }}>農園が広がる時</h1>
      </div>
      <p className="text-sm mb-6" style={{ color: 'rgba(59,47,30,0.55)' }}>
        同じ土で育つ人と、言葉だけで出会う
      </p>

      {/* タブ */}
      <div className="flex gap-2 mb-6">
        {TAB_ORDER.map(t => {
          const active = t === type
          return (
            <button
              key={t}
              onClick={() => handleTabClick(t)}
              className="flex-1 py-3 rounded-xl text-sm font-bold"
              style={{
                background: active ? ACTIVE_BG : INACTIVE_BG,
                color: '#FFFFFF',
                border: 'none', cursor: 'pointer',
              }}
            >
              {TAB_CONFIG[t].icon} {TAB_CONFIG[t].label}
            </button>
          )
        })}
      </div>

      {type === 'light' ? <LightRoomView /> : <ShadowRoomView />}

      <BottomNav
        onHomeClick={() => {
          if (step === 'mi_room_explore') advanceStep('ne_room_popup')
          else if (step === 'ne_room_explore') advanceStep('completion_modal')
        }}
      />

      {phase === 'explain_light' && (
        <RoomExplainFlow page={0} onNext={() => advanceStep('room_chat_light')} />
      )}

      {phase === 'explain_shadow' && (
        <RoomExplainFlow page={1} onNext={() => { advanceStep('room_chat'); router.replace('/room/shadow') }} />
      )}

      {phase === 'watering' && (
        <WateringAnimation onComplete={() => setGrowthShown(true)} />
      )}

      {phase === 'growth' && (
        <GrowthModal onStart={handleGrowthStart} />
      )}

      {phase === 'thanks' && (
        <ThanksModal onClose={() => advanceStep('done')} />
      )}
    </div>
  )
}
