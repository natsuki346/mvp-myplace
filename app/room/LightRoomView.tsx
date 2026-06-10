'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/src/lib/supabase/client'
import { formatHashtag, MaterialIcon } from '@/app/onboarding/garden-setup/garden-visuals'
import RoomChatSheet from './RoomChatSheet'

type Tag = { id: string; text: string }

const ITEM_WIDTH = 132
const GAP = 16
const STEP = ITEM_WIDTH + GAP

export default function LightRoomView() {
  const [tags, setTags]               = useState<Tag[]>([])
  const [loading, setLoading]         = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [spacer, setSpacer]           = useState(0)
  const [openTag, setOpenTag]         = useState<Tag | null>(null)
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
    <div>
      {/* 土の境界線 */}
      <div style={{
        marginLeft: -24, marginRight: -24, height: 56,
        background: 'linear-gradient(to bottom, #E8DEC8 0%, #CCBA96 100%)',
        borderBottom: '3px solid #8B6914',
      }} />

      {/* 実カルーセル：境界線をまたいで実が並ぶ */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex"
        style={{
          marginLeft: -24, marginRight: -24, marginTop: -28,
          overflowX: 'auto', scrollSnapType: 'x mandatory',
          gap: GAP, paddingBottom: 24,
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
                width: ITEM_WIDTH,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer',
                transform: active ? 'scale(1.25)' : 'scale(0.85)',
                opacity: active ? 1 : 0.55,
                transition: 'transform 0.25s ease, opacity 0.25s ease',
              }}
            >
              <MaterialIcon type="tomato" size={56} />
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#fff', background: '#E86848',
                borderRadius: 999, padding: '2px 10px', whiteSpace: 'nowrap',
              }}>
                {formatHashtag(tag.text)}
              </span>
            </button>
          )
        })}
        <div style={{ flexShrink: 0, width: spacer }} />
      </div>

      <p className="text-center text-xs" style={{ color: 'rgba(59,47,30,0.45)' }}>
        スワイプして選び、タップして部屋に入る
      </p>

      {openTag && (
        <RoomChatSheet type="light" tagId={openTag.id} tagText={openTag.text} onClose={() => setOpenTag(null)} />
      )}
    </div>
  )
}
