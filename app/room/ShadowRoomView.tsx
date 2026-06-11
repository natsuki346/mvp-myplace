'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/src/lib/supabase/client'
import { formatHashtag } from '@/app/onboarding/garden-setup/garden-visuals'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import WateringAnimation from '@/src/components/tutorial/WateringAnimation'
import RoomChatSheet from './RoomChatSheet'
import ThanksModal from './ThanksModal'

type Tag = { id: string; text: string }

const ITEM_WIDTH = 160
const GAP = 24
const STEP = ITEM_WIDTH + GAP

const SECTION_HEIGHT = 240
const SEED_TOP  = 176 // 土の層の中（境界線より下）
const LABEL_TOP = 42  // 地表・空気の中（境界線より上）

// 土壌の粒子（装飾）：固定位置・サイズ
const SOIL_PARTICLES = [
  { cx: 24,  cy: 150, r: 2.5 }, { cx: 70,  cy: 200, r: 2 },
  { cx: 118, cy: 165, r: 3 },   { cx: 160, cy: 215, r: 2 },
  { cx: 205, cy: 155, r: 2.5 }, { cx: 248, cy: 205, r: 3 },
  { cx: 290, cy: 168, r: 2 },   { cx: 332, cy: 220, r: 2.5 },
  { cx: 370, cy: 158, r: 2 },   { cx: 45,  cy: 230, r: 2 },
  { cx: 145, cy: 145, r: 2 },   { cx: 270, cy: 145, r: 2.5 },
  { cx: 360, cy: 200, r: 2 },   { cx: 95,  cy: 225, r: 2.5 },
]

export default function ShadowRoomView() {
  const { step, advanceStep } = useTutorialStep()
  const [tags, setTags]               = useState<Tag[]>([])
  const [loading, setLoading]         = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [spacer, setSpacer]           = useState(0)
  const [openTag, setOpenTag]         = useState<Tag | null>(null)
  const [flowPhase, setFlowPhase]     = useState<'watering' | 'thanks' | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const userId = sessionStorage.getItem('user_id')
      if (!userId) { setLoading(false); return }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('tags') as any)
        .select('id, text')
        .eq('user_id', userId)
        .eq('type', 'shadow')
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (!cancelled) { setTags((data as Tag[]) ?? []); setLoading(false) }
    })()

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => setSpacer(Math.max(0, (el.clientWidth - ITEM_WIDTH) / 2))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [tags.length])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / STEP)
    setActiveIndex(Math.min(tags.length - 1, Math.max(0, idx)))
  }, [tags.length])

  const goTo = (i: number) => {
    scrollRef.current?.scrollTo({ left: i * STEP, behavior: 'smooth' })
  }

  if (loading) {
    return <p className="text-sm text-center mt-10" style={{ color: 'rgba(120,100,70,0.5)' }}>読み込み中...</p>
  }

  if (tags.length === 0) {
    return <p className="text-sm text-center mt-10" style={{ color: 'rgba(120,100,70,0.5)' }}>タグが見つかりません</p>
  }

  return (
    <div>
      <p className="text-center text-xs mb-4" style={{ color: 'rgba(59,47,30,0.45)' }}>
        スワイプして選び、タップして部屋に入る
      </p>

      {/* 土壌断面 + タネカルーセル */}
      <div style={{ position: 'relative', marginLeft: -24, marginRight: -24, height: SECTION_HEIGHT, overflow: 'hidden' }}>
        {/* 先頭のRoomへの誘導矢印 */}
        {step === 'room_chat' && !openTag && (
          <div
            className="absolute flex flex-col items-center"
            style={{ left: '50%', top: 4, transform: 'translateX(-50%)', zIndex: 160, pointerEvents: 'none' }}
          >
            <div className="flex flex-col items-center animate-bounce">
              <div
                className="rounded-xl px-3 py-2"
                style={{
                  background: '#fff',
                  border: '1.5px solid #8B6914',
                  color: '#3B2F1E',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                }}
              >
                タップして話してみよう
              </div>
              <span style={{ fontSize: 0, lineHeight: 0 }}>
                <span
                  style={{
                    display: 'block', width: 0, height: 0, margin: '0 auto',
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '6px solid #8B6914',
                  }}
                />
              </span>
              <span style={{ fontSize: 22, color: '#8B6914', marginTop: 2, lineHeight: 1 }}>
                ↓
              </span>
            </div>
          </div>
        )}

        {/* 土壌断面SVG（背景） */}
        <svg
          viewBox={`0 0 390 ${SECTION_HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute inset-0"
          style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          <defs>
            <linearGradient id="soil-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C4A35A" />
              <stop offset="100%" stopColor="#8B6914" />
            </linearGradient>
          </defs>
          {/* 地表・空気 */}
          <rect x="0" y="0" width="390" height={SECTION_HEIGHT} fill="#F5F0E8" />
          {/* 土の層（波打った境界線） */}
          <path
            d={`M0,110 C65,85 130,135 195,108 C260,82 325,138 390,112 L390,${SECTION_HEIGHT} L0,${SECTION_HEIGHT} Z`}
            fill="url(#soil-gradient)"
          />
          {/* 土の粒子 */}
          {SOIL_PARTICLES.map((p, i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="#5A3A0A" opacity={0.3} />
          ))}
        </svg>

        {/* タネカルーセル */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex absolute inset-0"
          style={{
            overflowX: 'auto', scrollSnapType: 'x mandatory',
            gap: GAP,
          }}
        >
          <div style={{ flexShrink: 0, width: spacer }} />
          {tags.map((tag, i) => {
            const active = i === activeIndex
            return (
              <button
                key={tag.id}
                onClick={() => active ? setOpenTag(tag) : goTo(i)}
                style={{
                  scrollSnapAlign: 'center', flexShrink: 0,
                  position: 'relative', width: ITEM_WIDTH, height: '100%',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                {/* ハッシュタグラベル：土の上に浮かぶ（中央＝アクティブな種のみ表示） */}
                {active && (
                  <span style={{
                    position: 'absolute', top: LABEL_TOP, left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: 11, fontWeight: 600, color: '#fff', background: '#8B6914',
                    borderRadius: 999, padding: '2px 10px', whiteSpace: 'nowrap',
                  }}>
                    {formatHashtag(tag.text)}
                  </span>
                )}

                {/* タネ：土の層の中 */}
                <div style={{
                  position: 'absolute', top: SEED_TOP, left: '50%',
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 30%, #A9875F, #6B4E1A)',
                  boxShadow: '0 2px 6px rgba(60,40,10,0.4)',
                  transform: active
                    ? 'translate(-50%, -50%) scale(1.45)'
                    : 'translate(-50%, -50%) scale(0.85)',
                  opacity: active ? 1 : 0.55,
                  transition: 'transform 0.25s ease, opacity 0.25s ease',
                }} />
              </button>
            )
          })}
          <div style={{ flexShrink: 0, width: spacer }} />
        </div>
      </div>

      {openTag && (
        <RoomChatSheet
          type="shadow"
          tagId={openTag.id}
          tagText={openTag.text}
          onClose={() => {
            setOpenTag(null)
            if (step === 'room_chat') advanceStep('watering')
            else setFlowPhase('watering')
          }}
        />
      )}

      {flowPhase === 'watering' && (
        <WateringAnimation onComplete={() => setFlowPhase('thanks')} />
      )}

      {flowPhase === 'thanks' && (
        <ThanksModal onClose={() => setFlowPhase(null)} />
      )}
    </div>
  )
}
