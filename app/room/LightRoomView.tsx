'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase/client'
import { formatHashtag } from '@/app/onboarding/garden-setup/garden-visuals'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import { DaisySideView } from '@/src/components/garden/DaisySideView'
import RoomChatSheet from './RoomChatSheet'
import SubTagListSheet, { type SelectedChannel } from './SubTagListSheet'

type Tag = { id: string; text: string }

const SCREEN_WIDTH = 390
const TOTAL_HEIGHT = 420
const GROUND_LINE_Y = 300 // 地面ライン（画面の約71%）
const GRASS_HEIGHT = 8
const SOIL_HEIGHT = 5
const STEM_HEIGHT = 70   // 茎の高さ：全デイジー共通の固定値
const DAISY_SPACING = 130 // タグ4個以上の時の間隔

export default function LightRoomView() {
  const { step, advanceStep } = useTutorialStep()
  const [tags, setTags]       = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [openTag, setOpenTag] = useState<Tag | null>(null)
  const [channel, setChannel] = useState<SelectedChannel | null>(null)

  // プロフィール閲覧から戻ってきた場合にチャットを復元する
  useEffect(() => {
    const stored = sessionStorage.getItem('daime_chat_return')
    if (!stored) return
    try {
      const state = JSON.parse(stored) as {
        type: string; tagId: string; tagText: string
        subTagId: string | null; subTagName: string | null
      }
      if (state.type !== 'light') return
      sessionStorage.removeItem('daime_chat_return')
      setOpenTag({ id: state.tagId, text: state.tagText })
      setChannel({ subTagId: state.subTagId, name: state.subTagName ?? state.tagText })
    } catch {
      sessionStorage.removeItem('daime_chat_return')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const userId = sessionStorage.getItem('user_id')
      if (!userId) { setLoading(false); return }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('tags') as any)
        .select('id, text')
        .eq('user_id', userId)
        .eq('type', 'light')
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (!cancelled) { setTags((data as Tag[]) ?? []); setLoading(false) }
    })()

    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <p className="text-sm text-center mt-10" style={{ color: 'rgba(120,100,70,0.5)' }}>読み込み中...</p>
  }

  if (tags.length === 0) {
    return <p className="text-sm text-center mt-10" style={{ color: 'rgba(120,100,70,0.5)' }}>タグが見つかりません</p>
  }

  const scrollable = tags.length > 3
  const svgWidth = scrollable ? DAISY_SPACING * (tags.length + 1) : SCREEN_WIDTH
  const positions = tags.map((_, i) =>
    scrollable ? DAISY_SPACING * (i + 1) : SCREEN_WIDTH * (i + 1) / (tags.length + 1)
  )

  // チュートリアル：先頭デイジー（花＋ハッシュタグピル）の表示範囲（DaisySideViewの座標計算と一致させる）
  const tutorialFlowerY = GROUND_LINE_Y - STEM_HEIGHT
  const tutorialPillTopY = tutorialFlowerY - 90

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <p className="text-center text-xs mb-4" style={{ color: 'rgba(59,47,30,0.45)', flexShrink: 0 }}>
        タップして部屋に入る
      </p>

      {/* 農園ビュー：地上・地面ライン・地下を表示 */}
      <div
        style={{
          position: 'relative', marginLeft: -24, marginRight: -24, flex: 1,
          minHeight: TOTAL_HEIGHT, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          zIndex: (step === 'room_chat_mi' && !openTag) ? 50 : undefined,
        }}
      >
        {/* チュートリアル：先頭デイジーだけ穴を開けて明るく見せる暗転オーバーレイ */}
        {step === 'room_chat_mi' && !openTag && (
          <div
            className="absolute inset-0"
            style={{
              zIndex: 40, pointerEvents: 'none',
              background: `radial-gradient(circle at ${positions[0]}px ${tutorialFlowerY - 10}px, transparent 95px, rgba(0,0,0,0.45) 145px)`,
            }}
          />
        )}

        {/* 先頭のRoomへの誘導吹き出し：デイジーの真上に表示 */}
        {step === 'room_chat_mi' && !openTag && (
          <div
            className="absolute"
            style={{ left: positions[0], top: tutorialPillTopY - 48, transform: 'translateX(-50%)', zIndex: 50, pointerEvents: 'none' }}
          >
            <div
              className="rounded-xl px-3 py-2 animate-bounce"
              style={{
                position: 'relative',
                background: '#fff',
                border: '1.5px solid #4A7C59',
                color: '#3B2F1E',
                fontSize: 12,
                whiteSpace: 'nowrap',
              }}
            >
              タップして話してみよう
              {/* 吹き出しの三角：デイジーを指す */}
              <div style={{
                position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
                width: 0, height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '8px solid #fff',
              }} />
            </div>
          </div>
        )}

        <div style={{ flexShrink: 0, overflowX: scrollable ? 'auto' : 'hidden' }}>
          <svg width={svgWidth} height={TOTAL_HEIGHT} viewBox={`0 0 ${svgWidth} ${TOTAL_HEIGHT}`} style={{ display: 'block' }}>
            {/* 地上エリア */}
            <rect x={0} y={0} width={svgWidth} height={GROUND_LINE_Y} fill="#F5F0E8" />
            {/* 草ライン */}
            <rect x={0} y={GROUND_LINE_Y} width={svgWidth} height={GRASS_HEIGHT} fill="#4A7C59" />
            {/* 土ライン */}
            <rect x={0} y={GROUND_LINE_Y + GRASS_HEIGHT} width={svgWidth} height={SOIL_HEIGHT} fill="#8B6914" />
            {/* 地下エリア */}
            <rect
              x={0} y={GROUND_LINE_Y + GRASS_HEIGHT + SOIL_HEIGHT}
              width={svgWidth} height={TOTAL_HEIGHT - (GROUND_LINE_Y + GRASS_HEIGHT + SOIL_HEIGHT)}
              fill="#C9A96E"
            />

            {tags.map((tag, i) => (
              <g key={tag.id}>
                <DaisySideView
                  x={positions[i]}
                  stemBottomY={GROUND_LINE_Y}
                  stemHeight={STEM_HEIGHT}
                  tagLabel={formatHashtag(tag.text)}
                />
                {/* タップ領域 */}
                <rect
                  x={positions[i] - 65} y={GROUND_LINE_Y - STEM_HEIGHT - 100}
                  width={130} height={STEM_HEIGHT + 116}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setOpenTag(tag)}
                />
              </g>
            ))}
          </svg>
        </div>

        {/* 地下エリアの続き：残りの高さを土色で埋める */}
        <div style={{ flex: 1, background: '#C9A96E' }} />
      </div>

      {openTag && (
        <SubTagListSheet
          type="light"
          tag={openTag}
          onClose={() => {
            setOpenTag(null)
            setChannel(null)
            if (step === 'room_chat_mi') advanceStep('room_grow_animation')
          }}
          onSelect={setChannel}
        />
      )}

      {openTag && channel && (
        <RoomChatSheet
          type="light"
          tagId={openTag.id}
          tagText={openTag.text}
          subTagId={channel.subTagId}
          subTagName={channel.name}
          onClose={() => setChannel(null)}
        />
      )}
    </div>
  )
}
