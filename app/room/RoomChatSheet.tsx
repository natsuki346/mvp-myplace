'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMatchingTags, incrementGrowthPoint } from '@/src/lib/supabase/rooms'
import RoomChat from '@/src/components/room/RoomChat'
import { DUMMY_MESSAGES_COMMON } from './dummy-messages'

type RoomType = 'light' | 'shadow'

const ROOM_INFO: Record<RoomType, { icon: string; label: string }> = {
  light:  { icon: '🌼', label: 'Daisy' },
  shadow: { icon: '🌱', label: 'Seed' },
}

export default function RoomChatSheet({
  type,
  tagId,
  tagText,
  subTagId = null,
  subTagName = null,
  onClose,
  onMessageSent,
}: {
  type:       RoomType
  tagId:      string
  tagText:    string
  subTagId?:  string | null
  subTagName?: string | null
  onClose:    () => void
  onMessageSent?: () => void
}) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [matchTagIds, setMatchTagIds] = useState<string[]>([])
  const info = ROOM_INFO[type]

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    // 入室のたびに growth_point を +1
    incrementGrowthPoint(tagId)

    let cancelled = false
    ;(async () => {
      const ids = await getMatchingTags(tagText, type)
      if (!cancelled) setMatchTagIds(ids)
    })()

    return () => { cancelled = true }
  }, [tagId, tagText, type])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const handleProfileClick = (targetUserId: string) => {
    sessionStorage.setItem('daime_chat_return', JSON.stringify({
      type,
      tagId,
      tagText,
      subTagId: subTagId ?? null,
      subTagName: subTagName ?? null,
    }))
    router.push(`/profile/view?userId=${targetUserId}`)
  }

  const introMessages = subTagId ? [] : DUMMY_MESSAGES_COMMON

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          position: 'relative', width: '100%', maxWidth: 390, height: '100%',
          background: '#F5F0E8',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s ease',
          overflow: 'hidden',
        }}
      >
        <RoomChat
          onProfileClick={handleProfileClick}
          tagType={type}
          header={{
            title: subTagId ? `#${subTagName}` : `${tagText} の部屋`,
            subtitle: `${info.icon} ${info.label}`,
            onBack: close,
          }}
          introMessages={introMessages}
          matchTagIds={matchTagIds}
          subTagId={subTagId}
          ownTagId={tagId}
          channelKey={`${type}-${tagId}-${subTagId ?? 'main'}`}
          onMessageSent={onMessageSent}
        />
      </div>
    </div>
  )
}
