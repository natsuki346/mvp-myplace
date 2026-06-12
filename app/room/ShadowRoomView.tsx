'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/src/lib/supabase/client'
import { incrementGrowthPoint } from '@/src/lib/supabase/rooms'
import { recordTagEvent } from '@/src/lib/supabase/events'
import { formatHashtag } from '@/app/onboarding/garden-setup/garden-visuals'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import WateringAnimation from '@/src/components/tutorial/WateringAnimation'
import RoomChatSheet from './RoomChatSheet'
import SubTagListSheet, { type SelectedChannel } from './SubTagListSheet'
import SeedGraphic from './SeedGraphic'
import ThanksModal from './ThanksModal'

type Tag = { id: string; text: string; growth_point: number }

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

async function fetchShadowTags(userId: string): Promise<Tag[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('tags') as any)
    .select('id, text, growth_point')
    .eq('user_id', userId)
    .eq('type', 'shadow')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  return (data as Tag[]) ?? []
}

export default function ShadowRoomView({ revealGrowth = false }: { revealGrowth?: boolean }) {
  const { step, advanceStep } = useTutorialStep()
  const [tags, setTags]               = useState<Tag[]>([])
  const [loading, setLoading]         = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [spacer, setSpacer]           = useState(0)
  const [openTag, setOpenTag]         = useState<Tag | null>(null)
  const [channel, setChannel]         = useState<SelectedChannel | null>(null)
  const [flowPhase, setFlowPhase]     = useState<'watering' | 'thanks' | null>(null)
  const [wateringTagId, setWateringTagId] = useState<string | null>(null)
  const [growingTagId, setGrowingTagId]   = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const userId = sessionStorage.getItem('user_id')
      if (!userId) { setLoading(false); return }

      const data = await fetchShadowTags(userId)
      if (!cancelled) { setTags(data); setLoading(false) }
    })()

    return () => { cancelled = true }
  }, [])

  // チュートリアル完了時：実際のgrowth_pointを反映するため再取得
  useEffect(() => {
    if (step !== 'done') return
    const userId = sessionStorage.getItem('user_id')
    if (!userId) return

    let cancelled = false
    fetchShadowTags(userId).then(data => { if (!cancelled) setTags(data) })
    return () => { cancelled = true }
  }, [step])

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

  // チュートリアル中、room_chat_neのALLを閲覧したかどうか（チャンネル一覧に戻った後の水やりトリガーに使う）
  const viewedAllRef = useRef(false)
  // 直前に水やりしたタネのID（水やりアニメーション完了後に成長アニメーションを再生する）
  const lastWateredTagId = useRef<string | null>(null)

  // 閲覧チャットを閉じる → チャンネル一覧（SubTagListSheet）に戻るだけ
  const handleChatClose = () => {
    if (step === 'room_chat_ne' && channel?.subTagId === null) {
      viewedAllRef.current = true
    }
    setChannel(null)
  }

  // チャンネル一覧を閉じる（部屋から出る）→ ALL閲覧済みなら水やりアニメーション → 全画面の水やり演出へ
  const handleSubTagListClose = () => {
    const tag = openTag
    const shouldWater = viewedAllRef.current
    viewedAllRef.current = false
    setOpenTag(null)
    setChannel(null)

    if (!shouldWater || !tag) {
      if (step !== 'room_chat_ne') setFlowPhase('watering')
      return
    }

    setWateringTagId(tag.id)
    setTimeout(() => {
      setWateringTagId(null)

      const newPoint = (tag.growth_point ?? 0) + 1
      setTags(prev => prev.map(t => (t.id === tag.id ? { ...t, growth_point: newPoint } : t)))
      incrementGrowthPoint(tag.id)

      // watering ステップでの creditAllShadowTags による二重加算を防ぐ
      const userId = sessionStorage.getItem('user_id')
      if (userId) recordTagEvent(tag.id, userId, 'room_entered')

      lastWateredTagId.current = tag.id
      advanceStep('watering')
    }, 600)
  }

  // 全画面の水やりアニメーション完了（revealGrowth）→ 育った種の成長アニメーションを再生
  useEffect(() => {
    if (!revealGrowth || !lastWateredTagId.current) return
    const id = lastWateredTagId.current
    lastWateredTagId.current = null
    setGrowingTagId(id)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setGrowingTagId(null))
    })
  }, [revealGrowth])

  if (loading) {
    return <p className="text-sm text-center mt-10" style={{ color: 'rgba(120,100,70,0.5)' }}>読み込み中...</p>
  }

  if (tags.length === 0) {
    return <p className="text-sm text-center mt-10" style={{ color: 'rgba(120,100,70,0.5)' }}>タグが見つかりません</p>
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <p className="text-center text-xs mb-4" style={{ color: 'rgba(59,47,30,0.45)', flexShrink: 0 }}>
        スワイプして選び、タップして部屋に入る
      </p>

      {/* 土壌断面 + タネカルーセル：画面下部いっぱいに広げる */}
      <div style={{ position: 'relative', marginLeft: -24, marginRight: -24, flex: 1, minHeight: SECTION_HEIGHT, overflow: 'hidden' }}>
        {/* 先頭のRoomへの誘導矢印 */}
        {step === 'room_chat_ne' && !openTag && (
          <div
            className="absolute flex flex-col items-center"
            style={{ left: '50%', top: SEED_TOP + 10, transform: 'translateX(-50%)', zIndex: 160, pointerEvents: 'none' }}
          >
            <div className="flex flex-col items-center animate-bounce">
              {/* 上向き三角：タネを指す */}
              <span style={{ fontSize: 0, lineHeight: 0 }}>
                <span
                  style={{
                    display: 'block', width: 0, height: 0, margin: '0 auto',
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderBottom: '8px solid #fff',
                  }}
                />
              </span>
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
            </div>
          </div>
        )}

        {/* 土壌断面SVG（背景）：地表ラインを土壌エリア最上部に固定表示 */}
        <svg
          viewBox={`0 0 390 ${SECTION_HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute"
          style={{ top: 0, left: 0, width: '100%', height: SECTION_HEIGHT, pointerEvents: 'none' }}
        >
          <defs>
            <linearGradient id="soil-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C4993A" />
              <stop offset="100%" stopColor="#7A5010" />
            </linearGradient>
          </defs>
          {/* 地表・空気 */}
          <rect x="0" y="0" width="390" height={SECTION_HEIGHT} fill="#F5F0E8" />
          {/* 土の層（地表は直線の境界線） */}
          <path
            d={`M0,110 L390,110 L390,${SECTION_HEIGHT} L0,${SECTION_HEIGHT} Z`}
            fill="url(#soil-gradient)"
          />
          {/* 土の粒子 */}
          {SOIL_PARTICLES.map((p, i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="#5A3A0A" opacity={0.3} />
          ))}
        </svg>

        {/* 地表ラインより下、土壌エリア下端までを土色で埋める */}
        <div style={{ position: 'absolute', top: SECTION_HEIGHT, left: 0, right: 0, bottom: 0, background: '#7A5010' }} />

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

                {/* タネ：成長段階に応じたSVG */}
                <div style={{
                  position: 'absolute', top: SEED_TOP, left: '50%',
                  transform: active
                    ? 'translate(-50%, -50%) scale(1.45)'
                    : 'translate(-50%, -50%) scale(0.85)',
                  opacity: active ? 1 : 0.55,
                  transition: 'transform 0.25s ease, opacity 0.25s ease',
                }}>
                  <SeedGraphic growthPoint={(step === 'done' || revealGrowth) ? tag.growth_point : 0} animate={growingTagId === tag.id} />
                </div>

                {/* 水やりアニメーション：水滴が落ちてくる */}
                {wateringTagId === tag.id && (
                  <div style={{ position: 'absolute', top: SEED_TOP - 70, left: '50%', pointerEvents: 'none' }}>
                    {[0, 1, 2, 3, 4, 5].map(d => (
                      <span
                        key={d}
                        className="animate-waterDrop"
                        style={{
                          position: 'absolute', left: (d - 2.5) * 9, top: 0,
                          width: 7, height: 10,
                          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                          background: '#378ADD',
                          animationDelay: `${d * 60}ms`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
          <div style={{ flexShrink: 0, width: spacer }} />
        </div>
      </div>

      {openTag && (
        <SubTagListSheet
          type="shadow"
          tag={openTag}
          onClose={handleSubTagListClose}
          onSelect={setChannel}
        />
      )}

      {openTag && channel && (
        <RoomChatSheet
          type="shadow"
          tagId={openTag.id}
          tagText={openTag.text}
          subTagId={channel.subTagId}
          subTagName={channel.name}
          onClose={handleChatClose}
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
