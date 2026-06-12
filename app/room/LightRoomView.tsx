'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/src/lib/supabase/client'
import { formatHashtag, MaterialIcon } from '@/app/onboarding/garden-setup/garden-visuals'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import RoomChatSheet from './RoomChatSheet'
import SubTagListSheet, { type SelectedChannel } from './SubTagListSheet'

type Tag = { id: string; text: string }

const ITEM_WIDTH = 132
const GAP = 16
const STEP = ITEM_WIDTH + GAP

const ICON_SIZE = 72
const GROUND_MIN_HEIGHT = 220
const LINE_Y = 56          // 地表ライン：実が半分埋まる高さ
const LABEL_TOP = LINE_Y + 60 // ハッシュタグラベルの位置

export default function LightRoomView() {
  const { step, advanceStep } = useTutorialStep()
  const [tags, setTags]               = useState<Tag[]>([])
  const [loading, setLoading]         = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [spacer, setSpacer]           = useState(0)
  const [openTag, setOpenTag]         = useState<Tag | null>(null)
  const [channel, setChannel]         = useState<SelectedChannel | null>(null)
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
        .eq('type', 'light')
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <p className="text-center text-xs mb-4" style={{ color: 'rgba(59,47,30,0.45)', flexShrink: 0 }}>
        スワイプして選び、タップして部屋に入る
      </p>

      {/* 土の境界線 + 実カルーセル：画面下部いっぱいに広げる */}
      <div style={{ position: 'relative', marginLeft: -24, marginRight: -24, flex: 1, minHeight: GROUND_MIN_HEIGHT, overflow: 'hidden' }}>
        {/* チュートリアル：案内中の暗転オーバーレイ */}
        {step === 'room_chat_mi' && !openTag && (
          <div className="fixed inset-0" style={{ zIndex: 40, background: 'rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
        )}

        {/* 先頭のRoomへの誘導矢印 */}
        {step === 'room_chat_mi' && !openTag && (
          <div
            className="absolute flex flex-col items-center"
            style={{ left: '50%', top: 134, transform: 'translateX(-50%)', zIndex: 160, pointerEvents: 'none' }}
          >
            <div className="flex flex-col items-center animate-bounce">
              {/* 上向き三角：トマトを指す */}
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
                  border: '1.5px solid #4A7C59',
                  color: '#3B2F1E',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  marginTop: 28,
                }}
              >
                タップして話してみよう
              </div>
            </div>
          </div>
        )}

        {/* 土の境界線（背景） */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: LINE_Y,
          background: 'linear-gradient(to bottom, #E8DEC8 0%, #CCBA96 100%)',
          borderBottom: '3px solid #8B6914',
        }} />

        {/* 境界線より下、エリア下端までを土色で埋める */}
        <div style={{ position: 'absolute', top: LINE_Y, left: 0, right: 0, bottom: 0, background: '#CCBA96' }} />

        {/* 実カルーセル：境界線をまたいで実が並ぶ */}
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
                zIndex: (active && step === 'room_chat_mi' && !openTag) ? 50 : undefined,
              }}
            >
              <div style={{
                position: 'absolute', top: LINE_Y, left: '50%',
                transform: active
                  ? 'translate(-50%, -50%) scale(1.25)'
                  : 'translate(-50%, -50%) scale(0.85)',
                opacity: active ? 1 : 0.55,
                transition: 'transform 0.25s ease, opacity 0.25s ease',
              }}>
                <MaterialIcon type="tomato" size={ICON_SIZE} />
              </div>
              {active && (
                <span style={{
                  position: 'absolute', top: LABEL_TOP, left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 11, fontWeight: 600, color: '#fff', background: '#E86848',
                  borderRadius: 999, padding: '2px 10px', whiteSpace: 'nowrap',
                }}>
                  {formatHashtag(tag.text)}
                </span>
              )}
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
          onClose={() => {
            setOpenTag(null)
            setChannel(null)
            if (step === 'room_chat_mi') advanceStep('ne_room_popup')
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
