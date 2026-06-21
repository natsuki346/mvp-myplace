'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/src/lib/supabase/client'
import { commitSessionPoints, maxDepth, type ActionDepth } from '@/src/lib/growthPoint'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import DaisyBubble from '@/src/components/DaisyBubble'
import RoomChatSheet from './RoomChatSheet'
import SubTagListSheet, { type SelectedChannel } from './SubTagListSheet'

type Tag = { id: string; text: string; growth_point: number }

// ── Seed と完全統一した定数 ──
const TOTAL_HEIGHT  = 420
const GROUND_LINE_Y = 300
const GRASS_HEIGHT  = 8
const SOIL_HEIGHT   = 5
const BUBBLE_SIZE   = 80
const BUBBLE_TOP_Y  = GROUND_LINE_Y - BUBBLE_SIZE / 2   // = 260
const LABEL_TOP     = BUBBLE_TOP_Y - 40                  // = 220

// ── カルーセル定数（Seed と同一） ──
const ITEM_WIDTH = 160
const GAP        = 24
const STEP       = ITEM_WIDTH + GAP

export default function LightRoomView() {
  const { step, advanceStep } = useTutorialStep()
  const [tags, setTags]             = useState<Tag[]>([])
  const [loading, setLoading]       = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [spacer, setSpacer]         = useState(0)
  const [openTag, setOpenTag]       = useState<Tag | null>(null)
  const [channel, setChannel]       = useState<SelectedChannel | null>(null)
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
      if (state.type !== 'light') return
      sessionStorage.removeItem('daime_chat_return')
      setOpenTag({ id: state.tagId, text: state.tagText, growth_point: 0 })
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
        .select('id, text, growth_point')
        .eq('user_id', userId)
        .eq('type', 'light')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      if (!cancelled) { setTags((data as Tag[]) ?? []); setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  // スペーサー幅（コンテナ幅から ITEM_WIDTH を引いた半分）
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

  // チュートリアル完了後：このルーム滞在中のセッション内最深アクション（Seedと同じ仕組み）
  const sessionDepthRef = useRef<ActionDepth | null>(null)

  // タップして部屋に入る → セッションの最深アクションを「ルームを開く」で開始
  const openRoom = (tag: Tag) => {
    sessionDepthRef.current = 'room_open'
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

  // チャンネル一覧を閉じる（部屋から出る）→ チュートリアル完了後のみポイント加算
  const handleSubTagListClose = () => {
    const tag = openTag
    const depth = sessionDepthRef.current
    sessionDepthRef.current = null
    setOpenTag(null)
    setChannel(null)
    if (step === 'room_chat_mi') advanceStep('ne_room_popup')

    if (step === 'completed' && tag && depth) {
      const userId = sessionStorage.getItem('user_id')
      if (userId) {
        commitSessionPoints(tag.id, depth, userId).then(({ newGrowthPoint }) => {
          setTags(prev => prev.map(t => (t.id === tag.id ? { ...t, growth_point: newGrowthPoint } : t)))
        })
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

      {/* 土壌断面 + バブルカルーセル */}
      <div style={{
        position: 'relative',
        marginLeft: -24, marginRight: -24,
        flex: 1, minHeight: TOTAL_HEIGHT,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* 地面ライン・土壌エリア背景（Seed と完全同一） */}
        <div style={{ flexShrink: 0, overflow: 'hidden' }}>
          <svg
            viewBox={`0 0 390 ${TOTAL_HEIGHT}`}
            preserveAspectRatio="none"
            style={{ display: 'block', width: '100%', height: TOTAL_HEIGHT, pointerEvents: 'none' }}
          >
            <rect x={0} y={0} width={390} height={GROUND_LINE_Y} fill="#F5F0E8" />
            <rect x={0} y={GROUND_LINE_Y} width={390} height={GRASS_HEIGHT} fill="#4A7C59" />
            <rect x={0} y={GROUND_LINE_Y + GRASS_HEIGHT} width={390} height={SOIL_HEIGHT} fill="#8B6914" />
            <rect
              x={0} y={GROUND_LINE_Y + GRASS_HEIGHT + SOIL_HEIGHT}
              width={390} height={TOTAL_HEIGHT - (GROUND_LINE_Y + GRASS_HEIGHT + SOIL_HEIGHT)}
              fill="#C9A96E"
            />
          </svg>
        </div>
        <div style={{ flex: 1, background: '#C9A96E' }} />

        {/* カルーセル（Seed と同一構造） */}
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
            const clean  = tag.text.replace(/^#+/, '')

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
                {/* タグ名ラベル（アクティブのみ、バブルの上） */}
                {active && (
                  <span style={{
                    position: 'absolute', top: LABEL_TOP, left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: 11, fontWeight: 600, color: '#8B6914', background: '#F5D78E',
                    borderRadius: 999, padding: '2px 10px', whiteSpace: 'nowrap',
                  }}>
                    #{clean}
                  </span>
                )}

                {/* Daisy バブル（Seed の円形バブルと同じ配置・スケール） */}
                <div style={{
                  position: 'absolute', top: BUBBLE_TOP_Y, left: '50%',
                  transform: active
                    ? 'translate(-50%, 0) scale(1.2)'
                    : 'translate(-50%, 0) scale(0.8)',
                  opacity: active ? 1 : 0.5,
                  transition: 'transform 0.25s ease, opacity 0.25s ease',
                  width: BUBBLE_SIZE, height: BUBBLE_SIZE,
                  borderRadius: '50%', overflow: 'hidden',
                  boxShadow: active
                    ? '0 4px 16px rgba(0,0,0,0.18)'
                    : '0 2px 8px rgba(0,0,0,0.12)',
                }}>
                  <DaisyBubble size={BUBBLE_SIZE} />
                </div>
              </button>
            )
          })}

          <div style={{ flexShrink: 0, width: spacer }} />
        </div>
      </div>

      {openTag && (
        <SubTagListSheet
          type="light"
          tag={openTag}
          onClose={handleSubTagListClose}
          onSelect={handleSelectChannel}
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
          onMessageSent={handleMessageSent}
        />
      )}
    </div>
  )
}
