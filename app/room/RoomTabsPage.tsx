'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LightRoomView from './LightRoomView'
import ShadowRoomView from './ShadowRoomView'
import FriendRoomView from '@/src/components/room/FriendRoomView'
import HelpModal from '@/src/components/HelpModal'
import { BottomNav } from '@/src/components/BottomNav'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import RoomIntroSlidesModal from '@/src/components/tutorial/RoomIntroSlidesModal'
import FirstChatVisitWelcomeFlow from '@/src/components/onboarding/FirstChatVisitWelcomeFlow'
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

type TutorialPhase = 'room_intro' | null

export default function RoomTabsPage({ type }: { type: RoomType }) {
  const router = useRouter()
  const { step, advanceStep } = useTutorialStep()
  const { setGrowthStage } = useGrowthStage()
  const [showGrowthHelp, setShowGrowthHelp] = useState(false)
  const [showRoomIntro, setShowRoomIntro] = useState(false)

  // 初回訪問時にルーム案内ポップアップを自動表示
  useEffect(() => {
    if (!sessionStorage.getItem('room_visited')) {
      sessionStorage.setItem('room_visited', 'true')
      setShowRoomIntro(true)
    }
  }, [])

  const phase: TutorialPhase = step === 'room_intro' ? 'room_intro' : null

  // Seedルームは常にスキップする運用のため、成長演出〜完了画面までの
  // 流れ自体は実際に訪れた場合と同じにするが、訪れていないのでバブルは育てない
  // （seed_weight・visitイベントは記録しない）。ガーデン説明スライド③の
  // プレビューで使う実タグIDだけセットする。
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
      }
    }
    advanceStep('room_grow_animation')
  }

  // ne_room_popup に来たら、ポップアップを出さずに常にSeedルームをスキップする
  useEffect(() => {
    if (step === 'ne_room_popup') void handleSkipSeedVisit()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // 初回チャット訪問後の案内シーケンスに入ったら、樹の成長ステージを更新
  useEffect(() => {
    if (step === 'room_grow_animation') setGrowthStage('budding')
  }, [step, setGrowthStage])

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

      <BottomNav
        onGardenClick={() => { if (step === 'room_grow_animation') advanceStep('garden_onboarding') }}
      />

      {(showRoomIntro || phase === 'room_intro') && (
        <RoomIntroSlidesModal onNext={() => {
          setShowRoomIntro(false)
          advanceStep('room_chat_mi')
        }} />
      )}

      {/* 初回チャット訪問後：プロセスモーダル → ゲーテの名言 → ようこそモーダル → ガーデンへ矢印で誘導
          矢印表示中はstepを'room_grow_animation'のまま保ち、実際にガーデンタブをタップした
          瞬間（BottomNavのonGardenClick）にのみ'garden_onboarding'へ進める。ここでstepを
          進めてしまうと表示条件が直ちにfalseになり矢印が一瞬で消えてしまうため注意。 */}
      {step === 'room_grow_animation' && (
        <FirstChatVisitWelcomeFlow />
      )}

      {showGrowthHelp && (
        <HelpModal onClose={() => setShowGrowthHelp(false)} />
      )}
    </div>
  )
}
