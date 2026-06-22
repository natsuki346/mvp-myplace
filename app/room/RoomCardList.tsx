'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { getMatchingTags } from '@/src/lib/supabase/rooms'
import { DaisyIcon } from '@/src/components/icons/DaisyIcon'

type OwnTag = { id: string; text: string; type: 'light' | 'shadow' }

type RoomCard = {
  id: string
  text: string
  type: 'light' | 'shadow'
  memberCount: number
  preview: string | null
}

const TYPE_STYLE: Record<'light' | 'shadow', { bg: string; accent: string; icon: string }> = {
  light:  { bg: '#F5D78E', accent: '#8B6914', icon: '🌿' },
  shadow: { bg: '#D4B896', accent: '#7A5C3E', icon: '🌱' },
}

function RoomTypeIcon({ type }: { type: 'light' | 'shadow' }) {
  if (type === 'light') return <DaisyIcon size={16} stage={4} active />
  return <span>{TYPE_STYLE[type].icon}</span>
}

export default function RoomCardList({ type }: { type: 'light' | 'shadow' }) {
  const router = useRouter()
  const [cards,   setCards]   = useState<RoomCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const userId = sessionStorage.getItem('user_id')
      if (!userId) { setLoading(false); return }

      // ログインユーザーが持つ、指定タイプ（light/shadow）のタグのみ取得
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ownTags } = await (supabase.from('tags') as any)
        .select('id, text, type')
        .eq('user_id', userId)
        .eq('type', type)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      const tags = (ownTags as OwnTag[]) ?? []
      if (tags.length === 0) {
        if (!cancelled) { setCards([]); setLoading(false) }
        return
      }

      // 各タグについて、同じ text + type を持つ全ユーザーのタグ（人数 & メッセージ範囲）を取得
      const matches = await Promise.all(
        tags.map(t => getMatchingTags(t.text, t.type))
      )

      const allTagIds = Array.from(new Set(matches.flat()))

      let latestByTagId = new Map<string, { content: string; created_at: string }>()
      if (allTagIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: messages } = await (supabase.from('messages') as any)
          .select('tag_id, content, created_at')
          .in('tag_id', allTagIds)
          .order('created_at', { ascending: false })

        latestByTagId = new Map(
          ((messages as { tag_id: string; content: string; created_at: string }[]) ?? [])
            .map(m => [m.tag_id, { content: m.content, created_at: m.created_at }])
        )
      }

      const result: RoomCard[] = tags.map((t, i) => {
        const matchIds = matches[i]
        let preview: string | null = null
        let latestAt = ''
        for (const id of matchIds) {
          const msg = latestByTagId.get(id)
          if (msg && msg.created_at > latestAt) {
            preview = msg.content
            latestAt = msg.created_at
          }
        }
        return {
          id: t.id,
          text: t.text,
          type: t.type,
          memberCount: matches[i].length,
          preview,
        }
      })

      if (!cancelled) {
        setCards(result)
        setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [type])

  if (loading) {
    return <p className="text-sm text-center" style={{ color: 'rgba(120,100,70,0.5)' }}>読み込み中...</p>
  }

  if (cards.length === 0) {
    return <p className="text-sm text-center" style={{ color: 'rgba(120,100,70,0.5)' }}>タグが見つかりません</p>
  }

  const style = TYPE_STYLE[type]

  return (
    <div className="flex flex-col gap-3">
      {cards.map(card => (
        <button
          key={card.id}
          onClick={() => router.push(`/onboarding/room-visit/${card.type}/chat?tag=${encodeURIComponent(card.text)}`)}
          className="w-full text-left px-5 py-4 rounded-2xl transition-opacity hover:opacity-80"
          style={{ background: style.bg, border: 'none' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold flex items-center gap-1.5" style={{ color: style.accent }}>
              <RoomTypeIcon type={card.type} /> {card.text}
            </span>
            <span style={{ color: style.accent, opacity: 0.4, fontSize: 18 }}>›</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs" style={{ color: style.accent, opacity: 0.7 }}>
              👥 {card.memberCount}人
            </span>
            <span
              className="text-xs truncate"
              style={{ color: style.accent, opacity: 0.55, maxWidth: '65%' }}
            >
              {card.preview ?? 'まだメッセージはありません'}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}
