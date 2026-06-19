'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LightRoomView from './LightRoomView'
import ShadowRoomView from './ShadowRoomView'
import FriendRoomView from '@/src/components/room/FriendRoomView'
import HelpModal from '@/src/components/HelpModal'
import { BottomNav } from '@/src/components/BottomNav'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import RoomIntroModal from '@/src/components/tutorial/RoomIntroModal'
import NeRoomPopup from '@/src/components/tutorial/NeRoomPopup'
import GrowthTransitionOverlay from '@/src/components/tree/GrowthTransitionOverlay'
import WhyModal from '@/src/components/onboarding/WhyModal'
import { useGrowthStage } from '@/src/components/tree/useGrowthStage'
import { DaisyIcon } from '@/src/components/icons/DaisyIcon'
import { supabase } from '@/src/lib/supabase/client'

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

type TutorialPhase = 'room_intro' | 'ne_room_popup' | null

export default function RoomTabsPage({ type }: { type: RoomType }) {
  const router = useRouter()
  const { step, advanceStep } = useTutorialStep()
  const { setGrowthStage } = useGrowthStage()
  const [showGrowthHelp, setShowGrowthHelp] = useState(false)
  const [showSeedWhyModal, setShowSeedWhyModal] = useState(false)
  const [showRoomIntro, setShowRoomIntro] = useState(false)

  // 初回訪問時にルーム案内ポップアップを自動表示
  useEffect(() => {
    if (!sessionStorage.getItem('room_visited')) {
      sessionStorage.setItem('room_visited', 'true')
      setShowRoomIntro(true)
    }
  }, [])

  const phase: TutorialPhase =
    step === 'room_intro'      ? 'room_intro'
    : step === 'ne_room_popup' ? 'ne_room_popup'
    : null

  // 「今はいい」でSeedルーム訪問をスキップした場合、成長演出〜完了画面までの
  // 流れ自体は実際に訪れた場合と同じにするが、訪れていないのでバブルは育てない
  // （seed_weight・visitイベントは記録しない）。garden側の吹き出しテキストを
  // 切り替えるためのフラグだけセットする。
  const handleSkipSeedVisit = async () => {
    const userId = sessionStorage.getItem('user_id')
    if (userId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tag } = await (supabase.from('tags') as any)
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'shadow')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (tag?.id) {
        sessionStorage.setItem('onboarding_seed_tag_id', tag.id)
        sessionStorage.setItem('onboarding_seed_visit_skipped', '1')
      }
    }
    advanceStep('room_grow_animation')
  }

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

      {type === 'light' ? <LightRoomView /> : type === 'shadow' ? <ShadowRoomView onSeedChatDone={() => advanceStep('room_grow_animation')} /> : <FriendRoomView />}

      <BottomNav />

      {(showRoomIntro || phase === 'room_intro') && (
        <RoomIntroModal onNext={() => {
          setShowRoomIntro(false)
          advanceStep('room_chat_mi')
        }} />
      )}

      {phase === 'ne_room_popup' && (
        <NeRoomPopup
          onNext={() => { advanceStep('room_chat_ne'); router.replace('/room/shadow') }}
          onSkip={() => { void handleSkipSeedVisit() }}
        />
      )}

      {/* 成長アニメーション：Seedルーム閲覧完了後（「今はいい」でスキップした場合も同じアニメーション・同じ流れに合流する） */}
      {step === 'room_grow_animation' && (
        <GrowthTransitionOverlay
          stage="budding"
          quote={{ text: '喜びは分かち合うことで倍になり\n悲しみは分かち合うことで半分になる', author: 'ゲーテ', fontSize: 17 }}
          message={{ title: 'あなたは一人じゃない。🤝', subtitle: 'あなたのままでつながれる', subtitleSize: 19 }}
          buttonText="次へ"
          onNext={() => { setGrowthStage('budding'); setShowSeedWhyModal(true) }}
        />
      )}

      {/* プロセスモーダル③：アニメーション後に表示 */}
      {showSeedWhyModal && (
        <WhyModal
          currentStep={3}
          onStart={() => { setShowSeedWhyModal(false); advanceStep('garden_onboarding'); router.push('/home') }}
        />
      )}

      {/* オンボーディング最終：Seedルーム閲覧後にガーデンへ */}
      {step === 'onboarding_seed_visit' && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 390, padding: '0 24px', zIndex: 100,
          pointerEvents: 'none',
        }}>
          <button
            onClick={() => router.push('/home')}
            style={{
              width: '100%', padding: '14px', borderRadius: 24, border: 'none',
              background: '#4A7C59', color: '#FFFFFF',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              pointerEvents: 'auto',
              boxShadow: '0 4px 16px rgba(74,124,89,0.4)',
            }}
          >
            ガーデンへ 🌿
          </button>
        </div>
      )}

      {showGrowthHelp && (
        <HelpModal onClose={() => setShowGrowthHelp(false)} />
      )}
    </div>
  )
}
