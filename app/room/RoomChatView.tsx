'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { getMatchingTags, incrementGrowthPoint, creditDailyView } from '@/src/lib/supabase/rooms'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import RootGrowAnimation, { ROOT_GROW_SHOWN_KEY } from '@/src/components/tutorial/RootGrowAnimation'
import RoomChat from '@/src/components/room/RoomChat'
import { DUMMY_MESSAGES_COMMON } from './dummy-messages'

const ROOM_INFO: Record<'light' | 'shadow', { icon: string; label: string; backHref: string }> = {
  light:  { icon: '🌼', label: 'Daisy', backHref: '/onboarding/room-visit/light' },
  shadow: { icon: '🌱', label: 'Seed',  backHref: '/onboarding/room-visit/shadow' },
}

export default function RoomChatView({ type }: { type: 'light' | 'shadow' }) {
  const router = useRouter()
  const params = useParams<{ tag: string }>()
  const tag = decodeURIComponent(params.tag ?? '')
  const info = ROOM_INFO[type]
  const { step } = useTutorialStep()

  const [ready, setReady] = useState(false)
  const [ownTagId, setOwnTagId] = useState<string | null>(null)
  const [matchTagIds, setMatchTagIds] = useState<string[]>([])
  const [alreadyShownRootGrow] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(ROOT_GROW_SHOWN_KEY) === '1'
  )
  const [rootGrowDone, setRootGrowDone] = useState(false)

  const showRootGrow = !alreadyShownRootGrow && !rootGrowDone && type === 'shadow' && step === 'room_chat_ne'

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const uid = sessionStorage.getItem('user_id')
      if (!uid || !tag) return

      // 自分のタグ行を取得（投稿・growth_point の対象）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: own } = await (supabase.from('tags') as any)
        .select('id')
        .eq('user_id', uid)
        .eq('text', tag)
        .eq('type', type)
        .maybeSingle()

      const ownId = (own as { id: string } | null)?.id ?? null
      if (cancelled) return
      setOwnTagId(ownId)

      // ルーム閲覧クレジット（1日1回まで growth_point +1）
      if (ownId) creditDailyView(ownId, uid)

      // 同じタグを持つ全ユーザーのタグ範囲を取得
      const matches = await getMatchingTags(tag, type)
      if (cancelled) return
      const ids = matches.map(m => m.id)
      setMatchTagIds(ids)
      setReady(true)  // matchTagIdsが0件でもreadyにする（空部屋として表示）
    })()

    return () => { cancelled = true }
  }, [tag, type])

  return (
    <div style={{ height: '100svh', maxWidth: 390, margin: '0 auto' }}>
      {!ready ? (
        <div className="flex flex-col" style={{ height: '100%', background: '#F5F0E8' }}>
          <p className="text-sm text-center" style={{ color: '#8B7355', marginTop: 24 }}>読み込み中...</p>
        </div>
      ) : (
        <RoomChat
          header={{
            title: `${tag} の部屋`,
            subtitle: `${info.icon} ${info.label}`,
            onBack: () => router.push(info.backHref),
          }}
          introMessages={DUMMY_MESSAGES_COMMON}
          matchTagIds={matchTagIds}
          ownTagId={ownTagId}
          channelKey={`${type}-${tag}`}
          onMessageSent={() => { if (ownTagId) incrementGrowthPoint(ownTagId) }}
          overlay={showRootGrow && <RootGrowAnimation onComplete={() => setRootGrowDone(true)} />}
        />
      )}
    </div>
  )
}
