'use client'

import { useEffect, useState } from 'react'
import { getMatchingTags, incrementGrowthPoint } from '@/src/lib/supabase/rooms'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import { formatHashtag } from '@/app/onboarding/garden-setup/garden-visuals'
import RoomChat from '@/src/components/room/RoomChat'
import { DUMMY_MESSAGES, DUMMY_MESSAGES_VIEWONLY } from './dummy-messages'

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
  const [visible, setVisible] = useState(false)
  const [matchTagIds, setMatchTagIds] = useState<string[]>([])
  const info = ROOM_INFO[type]
  const { step } = useTutorialStep()
  const viewOnly = (type === 'light' && step === 'room_chat_mi') || (type === 'shadow' && step === 'room_chat_ne')

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    // 入室のたびに growth_point を +1（閲覧モードは対象外。チュートリアルでは閉じた時に加算する）
    if (!viewOnly) incrementGrowthPoint(tagId)

    let cancelled = false
    ;(async () => {
      const matches = await getMatchingTags(tagText, type)
      if (!cancelled) setMatchTagIds(matches.map(m => m.id))
    })()

    return () => { cancelled = true }
  }, [tagId, tagText, type, viewOnly])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const introMessages = subTagId ? [] : (viewOnly ? DUMMY_MESSAGES_VIEWONLY[type] : DUMMY_MESSAGES[type])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          position: 'relative', width: '100%', maxWidth: 390, height: '100%',
          background: '#F5F0E8',
          opacity: viewOnly ? (visible ? 1 : 0) : undefined,
          transform: viewOnly ? undefined : (visible ? 'translateY(0)' : 'translateY(100%)'),
          transition: viewOnly ? 'opacity 0.3s ease' : 'transform 0.32s ease',
          overflow: 'hidden',
        }}
      >
        <RoomChat
          header={
            viewOnly
              ? {
                  title: formatHashtag(tagText),
                  onBack: close,
                  backContent: '← 戻る',
                  backColor: '#3B2F1E',
                  borderColor: 'rgba(59,47,30,0.08)',
                  extra: visible && (
                    <span style={{
                      fontSize: 11, background: '#FEE2E2', color: '#DC2626',
                      borderRadius: 12, padding: '3px 10px', whiteSpace: 'nowrap', flexShrink: 0,
                    }}>読んだら戻ろう</span>
                  ),
                }
              : {
                  title: subTagId ? `#${subTagName}` : `${tagText} の部屋`,
                  subtitle: `${info.icon} ${info.label}`,
                  onBack: close,
                }
          }
          banner={viewOnly && (
            <div style={{ flexShrink: 0, padding: '6px 16px', background: '#D4B896', textAlign: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#3B2F1E' }}>👀 閲覧モード</span>
            </div>
          )}
          introMessages={introMessages}
          introVariant={viewOnly ? 'viewonly' : 'chat'}
          matchTagIds={matchTagIds}
          subTagId={subTagId}
          ownTagId={tagId}
          readOnly={viewOnly}
          channelKey={`${type}-${tagId}-${subTagId ?? 'main'}`}
          onMessageSent={onMessageSent}
        />
      </div>
    </div>
  )
}
