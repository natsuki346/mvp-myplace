'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LightRoomView from './LightRoomView'
import ShadowRoomView from './ShadowRoomView'
import FriendRoomView from '@/src/components/room/FriendRoomView'
import GrowthHelpModal from './GrowthHelpModal'
import { BottomNav } from '@/src/components/BottomNav'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import RoomIntroModal from '@/src/components/tutorial/RoomIntroModal'
import RoomExplainMiModal from '@/src/components/tutorial/RoomExplainMiModal'
import RoomExplainNeModal from '@/src/components/tutorial/RoomExplainNeModal'
import NeRoomPopup from '@/src/components/tutorial/NeRoomPopup'
import GrowthResultModal from '@/src/components/tutorial/GrowthResultModal'
import GrowthModal from '@/src/components/tutorial/GrowthModal'
import ThankYouModal from '@/src/components/tutorial/ThankYouModal'
import GrowthTransitionOverlay from '@/src/components/tree/GrowthTransitionOverlay'
import { useGrowthStage } from '@/src/components/tree/useGrowthStage'
import { DaisyIcon } from '@/src/components/icons/DaisyIcon'

type RoomType = 'light' | 'shadow' | 'friend'

const TAB_ORDER: RoomType[] = ['light', 'shadow', 'friend']

const TAB_CONFIG: Record<RoomType, { label: string; icon: string }> = {
  light:  { label: 'Daisy', icon: '🌼' },
  shadow: { label: 'Seed', icon: '🌱' },
  friend: { label: 'Friend', icon: '👥' },
}

const ACTIVE_BG     = '#4A7C59'
const ACTIVE_TEXT   = '#F5F0E8'
const INACTIVE_BG   = '#D4B896'
const INACTIVE_TEXT = '#5C3A1E'

type TutorialPhase = 'room_intro' | 'room_explain_mi' | 'ne_room_popup' | 'room_explain_ne' | null

export default function RoomTabsPage({ type }: { type: RoomType }) {
  const router = useRouter()
  const { step, advanceStep } = useTutorialStep()
  const { setGrowthStage } = useGrowthStage()
  const [showGrowthHelp, setShowGrowthHelp] = useState(false)

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
      className="flex flex-col px-6 pt-16"
      style={{
        background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
        minHeight: '100svh', paddingBottom: 0,
      }}
    >
      <div className="mb-6" style={{ flexShrink: 0, position: 'relative' }}>
        <div className="flex items-center justify-center gap-2">
          {type === 'light'
            ? <DaisyIcon size={22} stage={4} active />
            : <span style={{ fontSize: 22 }}>{TAB_CONFIG[type].icon}</span>}
          <h1 className="text-xl font-bold" style={{ color: '#3B2F1E' }}>ありのままで繋がる場所</h1>
        </div>

        {/* 成長のしかたヘルプ */}
        <button
          onClick={() => setShowGrowthHelp(true)}
          aria-label="成長のしかた"
          style={{
            position: 'absolute', top: '50%', right: 0, transform: 'translateY(-50%)',
            width: 32, height: 32, borderRadius: '50%',
            border: 'none', background: '#FFFFFF', color: '#4A7C59',
            fontSize: 15, fontWeight: 700, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          }}
        >？</button>
      </div>

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
                color: active ? ACTIVE_TEXT : INACTIVE_TEXT,
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {t === 'light'
                ? <DaisyIcon size={18} stage={4} active={active} />
                : <span>{TAB_CONFIG[t].icon}</span>}
              {TAB_CONFIG[t].label}
            </button>
          )
        })}
      </div>

      {type === 'light' ? <LightRoomView /> : type === 'shadow' ? <ShadowRoomView /> : <FriendRoomView />}

      <BottomNav />

      {phase === 'room_intro' && (
        <RoomIntroModal onNext={() => advanceStep('room_explain_mi')} />
      )}

      {phase === 'room_explain_mi' && (
        <RoomExplainMiModal onNext={() => { advanceStep('room_chat_mi'); router.replace('/room/light') }} />
      )}

      {/* 成長アニメーション3：芽 → つぼみ */}
      {step === 'room_grow_animation' && (
        <GrowthTransitionOverlay
          stage="budding"
          quote={{ text: '喜びは分かち合うことで倍になり\n悲しみは分かち合うことで半分になる。', author: 'ゲーテ' }}
          message={{ title: 'あなたは一人じゃない。', subtitle: 'あなたの言葉が、人を繋ぐ。\nあなたの言葉は、誰かを救う', subtitleSize: 19 }}
          buttonText="次へ"
          onNext={() => { setGrowthStage('budding'); advanceStep('ne_room_popup') }}
        />
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

      {/* 「成長した！向き合えた！」モーダル */}
      {step === 'growth_result' && (
        <GrowthResultModal onNext={() => advanceStep('growth_explain')} />
      )}

      {/* 成長の仕組み説明（？ヘルプ画面と同じ内容） */}
      {step === 'growth_explain' && (
        <GrowthHelpModal buttonText="次へ" onClose={() => advanceStep('growth_modal')} />
      )}

      {/* 「向き合えてえらい！」モーダル */}
      {step === 'growth_modal' && (
        <GrowthModal onStart={() => advanceStep('thankyou_modal')} />
      )}

      {/* 「協力ありがとう」モーダル */}
      {step === 'thankyou_modal' && (
        <ThankYouModal onClose={() => { advanceStep('done'); router.push('/home') }} />
      )}

      {showGrowthHelp && (
        <GrowthHelpModal onClose={() => setShowGrowthHelp(false)} />
      )}
    </div>
  )
}
