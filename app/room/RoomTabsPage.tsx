'use client'

import { useRouter } from 'next/navigation'
import LightRoomView from './LightRoomView'
import ShadowRoomView from './ShadowRoomView'
import { BottomNav } from '@/src/components/BottomNav'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import RoomIntroModal from '@/src/components/tutorial/RoomIntroModal'
import RoomExplainMiModal from '@/src/components/tutorial/RoomExplainMiModal'
import RoomExplainNeModal from '@/src/components/tutorial/RoomExplainNeModal'
import NeRoomPopup from '@/src/components/tutorial/NeRoomPopup'
import GrowthModal from '@/src/components/tutorial/GrowthModal'
import ThankYouModal from '@/src/components/tutorial/ThankYouModal'

type RoomType = 'light' | 'shadow'

const TAB_ORDER: RoomType[] = ['light', 'shadow']

const TAB_CONFIG: Record<RoomType, { label: string; icon: string }> = {
  light:  { label: '実の部屋', icon: '🍅' },
  shadow: { label: '根の部屋', icon: '🌱' },
}

const ACTIVE_BG   = '#4A7C59'
const INACTIVE_BG = '#C4B49A'

type TutorialPhase = 'room_intro' | 'room_explain_mi' | 'ne_room_popup' | 'room_explain_ne' | null

export default function RoomTabsPage({ type }: { type: RoomType }) {
  const router = useRouter()
  const { step, advanceStep } = useTutorialStep()

  const phase: TutorialPhase =
    step === 'room_intro' ? 'room_intro'
    : step === 'room_explain_mi' ? 'room_explain_mi'
    : step === 'ne_room_popup' ? 'ne_room_popup'
    : step === 'room_explain_ne' ? 'room_explain_ne'
    : null

  const handleTabClick = (t: RoomType) => {
    router.replace(`/room/${t}`)
  }

  return (
    <div
      className="flex flex-col px-6 pt-12"
      style={{
        background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
        minHeight: '100svh', paddingBottom: 0,
      }}
    >
      <div className="flex items-center gap-2 mb-2" style={{ flexShrink: 0 }}>
        <span style={{ fontSize: 22 }}>{TAB_CONFIG[type].icon}</span>
        <h1 className="text-xl font-bold" style={{ color: '#3B2F1E' }}>農園が広がる時</h1>
      </div>
      <p className="text-sm mb-6" style={{ color: 'rgba(59,47,30,0.55)', flexShrink: 0 }}>
        同じ土で育つ人と、言葉だけで出会う
      </p>

      {/* タブ */}
      <div className="flex gap-2 mb-6" style={{ flexShrink: 0 }}>
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

      <BottomNav />

      {phase === 'room_intro' && (
        <RoomIntroModal onNext={() => advanceStep('room_explain_mi')} />
      )}

      {phase === 'room_explain_mi' && (
        <RoomExplainMiModal onNext={() => { advanceStep('room_chat_mi'); router.replace('/room/light') }} />
      )}

      {phase === 'ne_room_popup' && (
        <NeRoomPopup
          onNext={() => advanceStep('room_explain_ne')}
          onSkip={() => advanceStep('watering')}
        />
      )}

      {phase === 'room_explain_ne' && (
        <RoomExplainNeModal onNext={() => { advanceStep('room_chat_ne'); router.replace('/room/shadow') }} />
      )}

      {/* 「向き合えてえらい！」モーダル */}
      {step === 'growth_modal' && (
        <GrowthModal onStart={() => advanceStep('thankyou_modal')} />
      )}

      {/* 「協力ありがとう」モーダル */}
      {step === 'thankyou_modal' && (
        <ThankYouModal onClose={() => { advanceStep('done'); router.push('/home') }} />
      )}
    </div>
  )
}
