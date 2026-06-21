'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/src/lib/supabase/client'
import { getStage, maxDepth, commitSessionPoints, type ActionDepth } from '@/src/lib/growthPoint'
import { formatHashtag } from '@/app/onboarding/garden-setup/garden-visuals'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import { recordTagEvent } from '@/src/lib/supabase/events'
import RoomChatSheet from './RoomChatSheet'
import SubTagListSheet, { type SelectedChannel } from './SubTagListSheet'
import SeedQuoteModal from '@/src/components/room/SeedQuoteModal'

type Tag = { id: string; text: string; growth_point: number; stage: number; seed_weight: string | null }

// ガーデンと同じ設計：seed_weight の数値でステージを決定
function getSeedBubble(seedWeight: string | null): { emoji: string; bg: string; textColor: string } {
  const sw = parseFloat(String(seedWeight ?? ''))
  if (!isNaN(sw)) {
    if (sw >= 7) return { emoji: '🌼', bg: '#F5D78E', textColor: '#7A5C00' }
    if (sw >= 3) return { emoji: '🌿', bg: '#9DC08B', textColor: '#2D5A27' }
  }
  return { emoji: '🌱', bg: '#D4B896', textColor: '#6B4E1A' }
}

const ITEM_WIDTH = 160
const GAP = 24
const STEP = ITEM_WIDTH + GAP

// 地面ライン・土壌エリア：LightRoomViewと完全に統一
const TOTAL_HEIGHT  = 420
const GROUND_LINE_Y = 300 // 地面ライン（画面の約71%）
const GRASS_HEIGHT  = 8
const SOIL_HEIGHT   = 5

const BUBBLE_DIAMETER = 80
// バブル中心 = 地面ラインに合わせる（ガーデンと同じ）
const BUBBLE_TOP_Y  = GROUND_LINE_Y - BUBBLE_DIAMETER / 2   // = 260
const LABEL_TOP     = BUBBLE_TOP_Y - 40  // バブルの上にラベル

async function fetchShadowTags(userId: string): Promise<Tag[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('tags') as any)
    .select('id, text, growth_point, stage, seed_weight')
    .eq('user_id', userId)
    .eq('type', 'shadow')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) {
    // stage/seed_weight が未マイグレーション環境ではフォールバック
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fallback = await (supabase.from('tags') as any)
      .select('id, text, growth_point')
      .eq('user_id', userId)
      .eq('type', 'shadow')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    return ((fallback.data as Omit<Tag, 'stage' | 'seed_weight'>[] | null) ?? []).map(t => ({
      ...t, stage: 0, seed_weight: null,
    }))
  }

  return (data as Tag[]) ?? []
}

export default function ShadowRoomView({ onSeedChatDone }: { onSeedChatDone?: () => void }) {
  const { step, advanceStep } = useTutorialStep()
  const [tags, setTags]               = useState<Tag[]>([])
  const [loading, setLoading]         = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [spacer, setSpacer]           = useState(0)
  const [openTag, setOpenTag]         = useState<Tag | null>(null)
  const [channel, setChannel]         = useState<SelectedChannel | null>(null)
  const [quoteTarget, setQuoteTarget]       = useState<{ id: string; text: string } | null>(null)
  const [wateringTagId, setWateringTagId]   = useState<string | null>(null)
  const [growingTagId, setGrowingTagId]     = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // プロフィール閲覧から戻ってきた場合にチャットを復元する
  useEffect(() => {
    const stored = sessionStorage.getItem('daime_chat_return')
    if (!stored) return
    try {
      const state = JSON.parse(stored) as {
        type: string; tagId: string; tagText: string
        subTagId: string | null; subTagName: string | null
      }
      if (state.type !== 'shadow') return
      sessionStorage.removeItem('daime_chat_return')
      setOpenTag({ id: state.tagId, text: state.tagText, growth_point: 0, stage: 0, seed_weight: 'light' })
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

      const data = await fetchShadowTags(userId)
      if (!cancelled) { setTags(data); setLoading(false) }
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

  // チュートリアル完了後：このルーム滞在中のセッション内最深アクション
  const sessionDepthRef = useRef<ActionDepth | null>(null)

  // タップして部屋に入る → セッションの最深アクションを「ルームを開く」で開始
  const openRoom = (tag: Tag) => {
    sessionDepthRef.current = 'room_open'
    if (step === 'room_chat_ne') {
      sessionStorage.setItem('onboarding_seed_tag_id', tag.id)
    }
    setOpenTag(tag)
  }

  // チャンネル（ALL/サブタグ）を選ぶ → セッションの最深アクションを更新
  const handleSelectChannel = (ch: SelectedChannel) => {
    sessionDepthRef.current = maxDepth(sessionDepthRef.current, 'chat_open')
    setChannel(ch)
  }

  // メッセージを送信した → セッションの最深アクションを更新
  const handleMessageSent = () => {
    sessionDepthRef.current = maxDepth(sessionDepthRef.current, 'message_sent')
  }

  // 閲覧チャットを閉じる → チャンネル一覧（SubTagListSheet）に戻るだけ
  const handleChatClose = () => {
    setChannel(null)
  }

  // Seedルーム訪問時に seed_weight を +1（1セッション1タグにつき1回のみ）
  useEffect(() => {
    if (!openTag) return
    const userId = sessionStorage.getItem('user_id')
    if (!userId) return

    const visitKey = `seed_visited_${openTag.id}`
    if (sessionStorage.getItem(visitKey)) return
    sessionStorage.setItem(visitKey, '1')

    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tagData } = await (supabase.from('tags') as any)
        .select('seed_weight')
        .eq('id', openTag.id)
        .single()

      const currentSw = parseFloat(String(tagData?.seed_weight ?? '0'))
      const newSw = (isNaN(currentSw) ? 0 : currentSw) + 1

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('tags') as any)
        .update({ seed_weight: String(newSw) })
        .eq('id', openTag.id)
        .eq('user_id', userId)

      await recordTagEvent(openTag.id, userId, 'visit')
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTag?.id])

  // 育ったタネを反映：水滴アニメーション → growth_point/stage更新 → 成長アニメーション
  const revealLevelUp = (tagId: string, newGrowthPoint: number, newStage: number) => {
    setWateringTagId(tagId)
    setTimeout(() => {
      setWateringTagId(null)
      setTags(prev => prev.map(t => (t.id === tagId ? { ...t, growth_point: newGrowthPoint, stage: newStage } : t)))
      setGrowingTagId(tagId)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setGrowingTagId(null))
      })
    }, 600)
  }

  // チャンネル一覧を閉じる（部屋から出る）
  const handleSubTagListClose = () => {
    const tag = openTag
    const depth = sessionDepthRef.current
    sessionDepthRef.current = null
    setOpenTag(null)
    setChannel(null)

    // 初回チャット訪問が（Daisyではなく）Seedルームだった場合も、
    // LightRoomViewと同じ仕組みでオンボーディングの案内シーケンス（ゲーテの名言など）に進める。
    // ここでreturnしないと、下のランダム名言モーダルもこの後の案内シーケンス内の
    // ゲーテの名言と重なって表示されてしまう。
    if (step === 'room_chat_mi') {
      advanceStep('ne_room_popup')
      return
    }

    // Seedルーム閲覧完了（戻る2回目）→ アニメーションへ
    if (step === 'room_chat_ne') {
      onSeedChatDone?.()
      return
    }

    if (tag) {
      // 通常時はランダムな名言モーダル（0件の場合はモーダル内で即 onClose() が呼ばれる）
      setQuoteTarget({ id: tag.id, text: tag.text })
    }

    // ポイント加算：チュートリアル完了後のみ
    if (step === 'completed' && tag) {
      if (depth) {
        const userId = sessionStorage.getItem('user_id')
        if (userId) {
          commitSessionPoints(tag.id, depth, userId).then(({ newGrowthPoint, newStage, leveledUp }) => {
            if (leveledUp) {
              revealLevelUp(tag.id, newGrowthPoint, newStage)
            } else {
              setTags(prev => prev.map(t => (t.id === tag.id ? { ...t, growth_point: newGrowthPoint, stage: newStage } : t)))
            }
          })
        }
      }
    }
  }

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
      <div style={{ position: 'relative', marginLeft: -24, marginRight: -24, flex: 1, minHeight: TOTAL_HEIGHT, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* 地面ライン・土壌エリア（背景）：LightRoomViewと完全に統一 */}
        <div style={{ flexShrink: 0, overflow: 'hidden' }}>
          <svg
            viewBox={`0 0 390 ${TOTAL_HEIGHT}`}
            preserveAspectRatio="none"
            style={{ display: 'block', width: '100%', height: TOTAL_HEIGHT, pointerEvents: 'none' }}
          >
            {/* 地上エリア */}
            <rect x={0} y={0} width={390} height={GROUND_LINE_Y} fill="#F5F0E8" />
            {/* 草ライン */}
            <rect x={0} y={GROUND_LINE_Y} width={390} height={GRASS_HEIGHT} fill="#4A7C59" />
            {/* 土ライン */}
            <rect x={0} y={GROUND_LINE_Y + GRASS_HEIGHT} width={390} height={SOIL_HEIGHT} fill="#8B6914" />
            {/* 地下エリア */}
            <rect
              x={0} y={GROUND_LINE_Y + GRASS_HEIGHT + SOIL_HEIGHT}
              width={390} height={TOTAL_HEIGHT - (GROUND_LINE_Y + GRASS_HEIGHT + SOIL_HEIGHT)}
              fill="#C9A96E"
            />
          </svg>
        </div>

        {/* 地下エリアの続き：残りの高さを土色で埋める */}
        <div style={{ flex: 1, background: '#C9A96E' }} />

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
            const active   = i === activeIndex
            const isGrow   = growingTagId === tag.id
            const bubble   = getSeedBubble(tag.seed_weight)
            const dispBubble = isGrow ? { emoji: '🌿', bg: '#9DC08B', textColor: '#2D5A27' } : bubble
            return (
              <button
                key={tag.id}
                onClick={() => active ? openRoom(tag) : goTo(i)}
                style={{
                  scrollSnapAlign: 'center', flexShrink: 0,
                  position: 'relative', width: ITEM_WIDTH, height: '100%',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                {/* ハッシュタグラベル（アクティブのみ、バブルの上） */}
                {active && (
                  <span style={{
                    position: 'absolute', top: LABEL_TOP, left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 11, fontWeight: 600, color: '#8B6914', background: '#F5D78E',
                    borderRadius: 999, padding: '2px 10px', whiteSpace: 'nowrap',
                  }}>
                    {formatHashtag(tag.text)}
                  </span>
                )}

                {/* Seed バブル：ガーデンと同じ円形デザイン */}
                <div style={{
                  position: 'absolute', top: BUBBLE_TOP_Y, left: '50%',
                  transform: active
                    ? 'translate(-50%, 0) scale(1.2)'
                    : 'translate(-50%, 0) scale(0.8)',
                  opacity: active ? 1 : 0.5,
                  transition: 'transform 0.25s ease, opacity 0.25s ease, background 0.5s ease',
                  width: BUBBLE_DIAMETER, height: BUBBLE_DIAMETER,
                  borderRadius: '50%',
                  background: dispBubble.bg,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 2,
                  boxShadow: active
                    ? '0 4px 16px rgba(0,0,0,0.18)'
                    : '0 2px 8px rgba(0,0,0,0.12)',
                }}>
                  <span style={{ fontSize: 28, lineHeight: 1 }}>{dispBubble.emoji}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: dispBubble.textColor,
                    maxWidth: BUBBLE_DIAMETER - 8,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    paddingLeft: 4, paddingRight: 4,
                  }}>
                    #{tag.text.replace(/^#+/, '')}
                  </span>
                </div>

                {/* 水やりアニメーション：水滴が落ちてくる */}
                {wateringTagId === tag.id && (
                  <div style={{ position: 'absolute', top: BUBBLE_TOP_Y - 50, left: '50%', pointerEvents: 'none' }}>
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
          onSelect={handleSelectChannel}
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
          onMessageSent={handleMessageSent}
        />
      )}

      {quoteTarget && (
        <SeedQuoteModal
          tagId={quoteTarget.id}
          onClose={() => setQuoteTarget(null)}
        />
      )}
    </div>
  )
}
