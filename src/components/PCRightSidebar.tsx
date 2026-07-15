'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { getMatchingTags } from '@/src/lib/supabase/rooms'
import { getSubTags, type SubTag } from '@/src/lib/supabase/subtags'
import { UserAvatar } from '@/src/components/UserAvatar'
import { YUKI_ID, YUKI_NAME, YUKI_TAG } from '@/src/lib/mockYuki'
import CreateChannelModal from '@/app/room/CreateChannelModal'

// PC（md以上）専用の右サイドバー。表示/非表示は呼び出し側（RoomTabsPage）が
// state で制御する「動的スライドイン」型。幅 0（非表示）⇔ 280px（表示）を
// transition: width 0.2s ease でアニメーションする。スマホでは常に非表示。
//   type: 'channels' … 選択中タグのチャンネル一覧（# ALL / サブ / ＋作成）
//   type: 'friends'  … フレンド一覧（Yuki / さとみ / まさと ＋ 実フレンド）
//   type: null       … 非表示（幅0）

export type RightSidebarState = {
  type: 'channels' | 'friends' | null
  tag?: { id: string; text: string }
  roomType?: 'light' | 'shadow'
}

const TEXT_MAIN = '#3B2F1E'
const TEXT_SUB  = '#8B6914'
const TEXT_DIM  = 'rgba(59,47,30,0.45)'
const ACTIVE_BG = 'rgba(74,124,89,0.12)'

export default function PCRightSidebar({
  state,
  activeFriendId = '',
}: {
  state: RightSidebarState
  activeFriendId?: string
}) {
  // ホーム（/home/*）では右サイドバー（「いま話せる人」等）を出さない。
  // 右サイドバーはチャット系画面専用。
  const pathname = usePathname()
  if (pathname.startsWith('/home')) return null

  const open = state.type !== null
  if (!open) return null

  // 右サイドバーはメインエリアを圧縮せず、上に重ねる overlay（fixed）で表示する。
  // これにより開閉してもメインの幅が変わらず、バブル/土壌UIの位置がずれない。
  // アニメーションは無し（即時表示）。スマホでは非表示。
  return (
    <aside
      className="hidden md:flex flex-col fixed top-14 right-0 z-20 h-[calc(100svh-56px)] w-[280px] overflow-y-auto bg-white"
      style={{ borderLeft: '1px solid rgba(139,115,85,0.2)' }}
    >
      {state.type === 'channels' && state.tag && (
        <ChannelList tag={state.tag} roomType={state.roomType ?? 'light'} />
      )}
      {state.type === 'friends' && <FriendList activeFriendId={activeFriendId} />}
    </aside>
  )
}

// ── チャンネル一覧（選択中タグ） ──
function ChannelList({ tag, roomType }: { tag: { id: string; text: string }; roomType: 'light' | 'shadow' }) {
  const router   = useRouter()
  const pathname = usePathname()
  const clean = tag.text.replace(/^#+/, '')
  const [subTags, setSubTags] = useState<SubTag[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const ids = await getMatchingTags(clean, roomType)
      const data = await getSubTags(ids.length > 0 ? ids : [tag.id])
      if (!cancelled) { setSubTags(data); setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [tag.id, roomType, clean])

  // チャンネルを開く：既存の復元方式（daime_chat_return）で中央にチャットを表示
  const openChannel = (subTagId: string | null, subTagName: string | null) => {
    sessionStorage.setItem('daime_chat_return', JSON.stringify({
      type: roomType, tagId: tag.id, tagText: clean, subTagId, subTagName,
    }))
    if (pathname === `/room/${roomType}`) {
      window.dispatchEvent(new Event('daime-chat-restore'))
    } else {
      router.push(`/room/${roomType}`)
    }
  }

  const Row = ({ label, onClick, dim = false }: { label: string; onClick: () => void; dim?: boolean }) => (
    <button
      onClick={onClick}
      className="w-full text-left bg-transparent border-none cursor-pointer text-sm py-2 px-3 rounded-lg truncate hover:bg-[rgba(139,115,85,0.08)]"
      style={{ color: dim ? TEXT_SUB : TEXT_MAIN }}
    >
      {label}
    </button>
  )

  return (
    <>
      <div className="px-4 py-3 border-b border-[rgba(139,115,85,0.15)]">
        <span className="text-sm font-bold truncate block" style={{ color: TEXT_MAIN }}>#{clean}</span>
      </div>
      <div className="p-2 flex flex-col gap-0.5">
        <Row label="💬 ALL" onClick={() => openChannel(null, null)} />
        {loading
          ? <p className="text-xs px-3 py-2 m-0" style={{ color: TEXT_DIM }}>読み込み中...</p>
          : subTags.map(st => (
              <Row key={st.id} label={`# ${st.name.replace(/^#+/, '')}`} onClick={() => openChannel(st.id, st.name)} />
            ))}
        <Row label="＋ チャンネルを作る" dim onClick={() => setShowCreate(true)} />
      </div>

      {showCreate && (
        <CreateChannelModal
          parentTagId={tag.id}
          onClose={() => setShowCreate(false)}
          onCreated={st => { setSubTags(prev => [...prev, st]); setShowCreate(false) }}
        />
      )}
    </>
  )
}

// ── フレンド一覧（DM） ──
type FriendRow = { id: string; username: string; avatar_url: string | null; sub: string }

const MOCK_FRIENDS: FriendRow[] = [
  { id: YUKI_ID, username: YUKI_NAME, avatar_url: null, sub: `#${YUKI_TAG}` },
  { id: 'a1b2c3d4-0000-4000-8000-000000000002', username: 'さとみ', avatar_url: null, sub: '' },
  { id: 'a1b2c3d4-0000-4000-8000-000000000003', username: 'まさと', avatar_url: null, sub: '' },
]
const MOCK_IDS = new Set(MOCK_FRIENDS.map(f => f.id))

function FriendList({ activeFriendId }: { activeFriendId: string }) {
  const router = useRouter()
  const [friends, setFriends] = useState<FriendRow[]>(MOCK_FRIENDS)

  useEffect(() => {
    const uid = localStorage.getItem('user_id')
    if (!uid) return
    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: conns } = await (supabase.from('connections') as any)
        .select('requester_id, receiver_id, requester:users!requester_id(id, username, avatar_url), receiver:users!receiver_id(id, username, avatar_url)')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${uid},receiver_id.eq.${uid}`)
      const real: FriendRow[] = (conns ?? [])
        .map((c: { requester_id: string; requester: FriendRow | null; receiver: FriendRow | null }) =>
          c.requester_id === uid ? c.receiver : c.requester)
        .filter((f: FriendRow | null): f is FriendRow => !!f && !MOCK_IDS.has(f.id))
        .map((f: FriendRow) => ({ id: f.id, username: f.username, avatar_url: f.avatar_url, sub: '' }))
      setFriends([...MOCK_FRIENDS, ...real])
    })()
  }, [])

  return (
    <>
      <div className="px-4 py-3 border-b border-[rgba(139,115,85,0.15)]">
        <span className="text-sm font-bold" style={{ color: TEXT_MAIN }}>DM</span>
      </div>
      <div className="p-2 flex flex-col gap-0.5">
        {friends.map(f => {
          const active = f.id === activeFriendId
          return (
            <button
              key={f.id}
              onClick={() => router.push(`/room/friend/chat?friendId=${f.id}&name=${encodeURIComponent(f.username)}`)}
              className="w-full flex items-center gap-2.5 text-left border-none cursor-pointer py-2 px-2 rounded-lg hover:bg-[rgba(139,115,85,0.08)]"
              style={{ background: active ? ACTIVE_BG : undefined }}
            >
              <UserAvatar username={f.username} avatarUrl={f.avatar_url} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate m-0" style={{ color: TEXT_MAIN }}>{f.username}</p>
                {f.sub && <p className="text-xs truncate m-0" style={{ color: TEXT_SUB }}>{f.sub}</p>}
              </div>
            </button>
          )
        })}
      </div>
    </>
  )
}
