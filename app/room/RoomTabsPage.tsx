'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LightRoomView from './LightRoomView'
import ShadowRoomView from './ShadowRoomView'
import FriendRoomView from '@/src/components/room/FriendRoomView'
import PCRightSidebar, { type RightSidebarState } from '@/src/components/PCRightSidebar'
import { BottomNav } from '@/src/components/BottomNav'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import RoomIntroSlidesModal from '@/src/components/tutorial/RoomIntroSlidesModal'
import { useGrowthStage } from '@/src/components/tree/useGrowthStage'
import { DaisyIcon } from '@/src/components/icons/DaisyIcon'
import { supabase } from '@/src/lib/supabase/client'

type RoomType = 'light' | 'shadow' | 'friend'

// Daisy(light)/Seed(shadow)/Private(friend) の3タブを表示する。
const TAB_ORDER: RoomType[] = ['light', 'shadow', 'friend']

const TAB_CONFIG: Record<RoomType, { label: string; icon: string }> = {
  light:  { label: 'Daisy', icon: '🌼' },
  shadow: { label: 'Seed', icon: '🌱' },
  friend: { label: 'Private', icon: '💬' },
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
  const [showRoomIntro, setShowRoomIntro] = useState(false)

  // 右サイドバー（PCのみ）の動的表示。初期は非表示。
  //  - Daisy/Seed のバブルをタップ（daime-pc-tag-select）→ チャンネル一覧
  //  - Private タブ → フレンド一覧
  //  - Daisy/Seed タブに切り替え → いったん閉じる（バブルタップで再度開く）
  const [rightSidebar, setRightSidebar] = useState<RightSidebarState>({ type: null })

  useEffect(() => {
    setRightSidebar(type === 'friend' ? { type: 'friends' } : { type: null })
  }, [type])

  useEffect(() => {
    const onSelect = (e: Event) => {
      const d = (e as CustomEvent).detail as { type: 'light' | 'shadow'; tagId: string; tagText: string }
      setRightSidebar({ type: 'channels', tag: { id: d.tagId, text: d.tagText }, roomType: d.type })
    }
    window.addEventListener('daime-pc-tag-select', onSelect)
    return () => window.removeEventListener('daime-pc-tag-select', onSelect)
  }, [])

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
    const userId = localStorage.getItem('user_id')
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
    // 右サイドバー（PCRightSidebar）はメインを圧縮しない overlay（fixed）表示。
    // メインコンテンツは常に画面全体（100vw）の中央に置く：左サイドバー240pxの
    // 半分だけ左へオフセット（md:-translate-x-[120px]）。mx-auto で main 内中央
    // ＝ vw/2+120 → -120 で vw/2（画面中央）に一致する。スマホは単一カラムのまま。
    <>
    <div
      className="flex flex-col px-6 pt-16 md:pt-8 md:items-center md:mx-auto md:max-w-2xl! md:h-[calc(100svh-56px)]! md:min-h-[calc(100svh-56px)]! md:-translate-x-[120px]"
      style={{
        background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
        minHeight: '100svh', paddingBottom: 0,
      }}
    >
      <div className="mb-6 w-full" style={{ flexShrink: 0 }}>
        <div className="flex items-center justify-center gap-2">
          {type === 'light'
            ? <DaisyIcon size={22} stage={4} active />
            : <span style={{ fontSize: 22 }}>{TAB_CONFIG[type].icon}</span>}
          <h1 className="text-xl font-bold" style={{ color: '#3B2F1E' }}>ありのままで繋がる場所</h1>
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-2 mb-6 w-full" style={{ flexShrink: 0 }}>
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

      {type === 'light' ? (
        <div className="w-full flex-1 flex flex-col min-h-0">
          <LightRoomView />
        </div>
      ) : type === 'shadow' ? (
        <div className="w-full flex-1 flex flex-col min-h-0">
          <ShadowRoomView onSeedChatDone={() => advanceStep('room_grow_animation')} />
        </div>
      ) : (
        <>
          {/* スマホ：従来どおりPrivateチャットのリストをメインUIに表示 */}
          <div className="md:hidden w-full">
            <FriendRoomView />
          </div>
          {/* PC：リストは左サイドバーに移動。メインはタイトルのみ＋プレースホルダ */}
          <div className="hidden md:flex flex-1 w-full items-center justify-center">
            <p className="text-sm text-center m-0" style={{ color: 'rgba(59,47,30,0.4)' }}>
              左のリストから相手を選んでください
            </p>
          </div>
        </>
      )}

      <BottomNav
        onGardenClick={() => { if (step === 'room_grow_animation') advanceStep('garden_onboarding') }}
      />

    </div>

      {/* モーダル類は overlay（fixed）。オフセット対象の div の外に出し、
          画面中央基準のままにする（内側に置くと translate の影響を受けるため）。 */}
      {(showRoomIntro || phase === 'room_intro') && (
        <RoomIntroSlidesModal onNext={() => {
          setShowRoomIntro(false)
          advanceStep('room_chat_mi')
        }} />
      )}

      <PCRightSidebar state={rightSidebar} />
    </>
  )
}
