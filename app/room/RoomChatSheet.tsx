'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { getMatchingTags, incrementGrowthPoint } from '@/src/lib/supabase/rooms'
import RoomChat from '@/src/components/room/RoomChat'
import RoomModeTabs from '@/src/components/room/RoomModeTabs'
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

  // 静的書き出し/プリレンダ時は document が無い。チャットはクライアントの
  // ユーザー操作でのみ開くため実際には常にクライアント側だが、念のためガード。
  if (typeof document === 'undefined') return null

  // position:fixed をビューポート基準にするため body 直下へ portal する。
  // （呼び出し元 RoomTabsPage は md:-translate-x-[120px] の transform を持ち、
  //   そのままだと fixed の基準が transform コンテナになりレイアウトが崩れるため）
  return createPortal(
    // PC時：左サイドバー(240px)・上部ナビ(56px)・右チャンネルサイドバー(280px)を避けて全画面表示
    <div
      className="md:left-[240px]! md:top-14! md:right-[280px]!"
      style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', justifyContent: 'center', paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div
        className="md:max-w-none! flex flex-col"
        style={{
          position: 'relative', width: '100%', maxWidth: 390, height: '100%',
          background: '#F5F0E8',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s ease',
          overflow: 'hidden',
        }}
      >
        {/* PC：上部にモードタブ（Daisy/Seed/Private）を維持。スマホでは非表示 */}
        <RoomModeTabs active={type} />
        <div className="flex-1 min-h-0">
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
    </div>,
    document.body,
  )
}
