'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import type { DummyMessage } from '@/app/room/dummy-messages'
import { DEFAULT_MESSAGES } from '@/src/lib/defaultMessages'

// ============================================================
// 型定義
// ============================================================
export type ChatMessageUser = { id: string; username: string; avatar_url: string | null }
export type ChatMessage = {
  id: string
  content: string
  created_at: string
  user_id: string
  users: ChatMessageUser | null
}
export type RoomChatHeader = {
  title: string
  subtitle?: string
  onBack?: () => void
  backContent?: React.ReactNode
  backColor?: string
  borderColor?: string
  extra?: React.ReactNode
}
export type RoomChatProps = {
  header: RoomChatHeader
  banner?: React.ReactNode
  introMessages?: DummyMessage[]
  matchTagIds: string[]
  subTagId?: string | null
  channelKey: string
  ownTagId?: string | null
  readOnly?: boolean
  tagType?: 'light' | 'shadow'
  onMessageSent?: () => void
  onProfileClick?: (targetUserId: string) => void
  overlay?: React.ReactNode
}

type Reaction = { emoji: string; count: number; reacted: boolean }
type ReactionsMap = Record<string, Reaction[]>
type RealtimeRow = { id: string; tag_id: string; sub_tag_id: string | null; user_id: string }

const QUICK_EMOJIS = ['🌼', '🌱', '✨', '💛', '🤍']
const EMOJI_CATS = [
  { icon: '😀', label: '顔・感情', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','🤩','😘','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤔','😐','😑','😶','😏','😒','🙄','😬','😔','😪','😴','😷','🤒','🤕','🤢','🤧','🥵','🥶','😵','🤯','🤠','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😈','👿','👹','👺','💀','👻','👽','👾','🤖','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','💕','💞','💓','💗','💖','💘','💝'] },
  { icon: '👋', label: '手・人', emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','✌️','🤞','🤟','🤘','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','🤝','🙏','💪','🦾','👀','👅','👄','👶','🧒','👦','👧','🧑','👱','👨','👩','🧓','👴','👵','🙍','🙎','🙅','🙆','💁','🙋','🙇','🤦','🤷'] },
  { icon: '🐶', label: '動物・自然', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🐢','🐍','🦎','🐙','🦑','🦐','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🐘','🦛','🦏','🐪','🦒','🦘','🐃','🐄','🐎','🐖','🐑','🐐','🦌','🐕','🐩','🐈','🐓','🦃','🦚','🦜','🦢','🕊️','🐇','🦝','🦨','🦡','🦦','🦥','🐁','🐀','🐿️','🦔','🌵','🎄','🌲','🌳','🌴','🌱','🌿','☘️','🍀','🍃','🍂','🍁','🍄','🌾','💐','🌷','🌹','🌺','🌸','🌼','🌻','🌞','🌝','🌙','⭐','🌟','✨','⚡','❄️','🔥','💧','🌊','🌈','☀️','⛅','🌤️','🌦️','🌧️'] },
  { icon: '🍎', label: '食べ物', emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🧄','🧅','🥕','🌽','🍠','🥐','🥯','🍞','🥖','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🥪','🥙','🧆','🌮','🌯','🥗','🥘','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','☕','🍵','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧊'] },
  { icon: '⚽', label: 'スポーツ', emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🎗️','🎫','🎟️','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎷','🪗','🎸','🎹','🎺','🎻','🪕','🥁','🪘','🎮','🕹️','🎲','♟️','🎯','🎳','🎰','🧩'] },
  { icon: '🚗', label: '乗り物', emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🛹','🛼','⛽','🚨','🚥','🚦','🛑','🚧','⚓','🛟','⛵','🚤','🛥️','🛳️','⛴️','🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚁','🚀','🛸','🚪','🛏️','🛋️','🪑','🚽','🚿','🛁','🧴','🧷','🧹','🧺','🧻','🪣','🧼','🫧','🧽','🧯','🛒','🪜','🧱','🖼️','🪆','🪅','🎁','🎈','🎉','🎊','🎀','🎋','🎍','🎆','🎇','🧨'] },
  { icon: '💡', label: 'モノ・記号', emojis: ['💡','🔦','🕯️','💰','💴','💵','💶','💷','💸','💳','🪙','💹','📈','📉','📊','📋','🗒️','🗓️','📆','📅','📌','📍','✂️','🖊️','✒️','🖌️','🖍️','📝','✏️','🔍','🔎','🔏','🔐','🔒','🔓','🔨','🪓','⚒️','🛠️','🔧','🪛','🔩','⚙️','⚖️','🔗','🧲','🪜','💊','💉','🩸','🩹','🩺','🧿','🧸','🪆','🖼️','🧵','🪡','🧶','🪢','👓','🕶️','🥽','💼','👝','👛','👜','🎒','🧳','👒','🎓','📿','💄','💍','💎'] },
  { icon: '#️⃣', label: '記号', emojis: ['#️⃣','*️⃣','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔠','🔡','🔢','🅰️','🆎','🅱️','🆑','🆒','🆓','ℹ️','🆔','Ⓜ️','🆕','🆖','🅾️','🆗','🅿️','🆘','🆙','🆚','▪️','▫️','◾','◽','◼️','◻️','⬛','⬜','🟥','🟧','🟨','🟩','🟦','🟪','🟫','⚫','⚪','🔴','🟠','🟡','🟢','🔵','🟣','🟤','🔶','🔷','🔸','🔹','🔺','🔻','💠','🔘','🔳','🔲','🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈'] },
]

// ============================================================
// メインコンポーネント
// ============================================================
export default function RoomChat({
  header,
  banner,
  introMessages = [],
  matchTagIds,
  subTagId = null,
  channelKey,
  ownTagId = null,
  readOnly = false,
  tagType,
  onMessageSent,
  onProfileClick,
  overlay,
}: RoomChatProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [userId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('user_id') : null
  )
  const [myProfile, setMyProfile] = useState<ChatMessageUser | null>(null)
  const [reactionsMap, setReactionsMap] = useState<ReactionsMap>({})
  // イントロ会話（mock）用のリアクション。DBには保存せずローカルのみで管理
  const [introReactionsMap, setIntroReactionsMap] = useState<ReactionsMap>({})
  const [openPickerMsgId, setOpenPickerMsgId] = useState<string | null>(null)
  const [longPressedMsgId, setLongPressedMsgId] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [activeCatIndex, setActiveCatIndex] = useState(0)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionUsers, setMentionUsers] = useState<ChatMessageUser[]>([])
  const matchingIdsRef = useRef<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // matchTagIds を ref に同期
  useEffect(() => {
    matchingIdsRef.current = new Set(matchTagIds)
  }, [matchTagIds])

  // 自分のプロフィール取得
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('users') as any)
        .select('id, username, avatar_url')
        .eq('id', userId)
        .single()
      if (data) setMyProfile(data as ChatMessageUser)
    })()
  }, [userId])

  // メッセージ取得
  useEffect(() => {
    ;(async () => {
      if (matchTagIds.length === 0) { setMessages([]); return }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase.from('messages') as any)
        .select('id, content, created_at, user_id, users ( id, username, avatar_url )')
        .in('tag_id', matchTagIds)
        .order('created_at', { ascending: true })
      query = subTagId ? query.eq('sub_tag_id', subTagId) : query.is('sub_tag_id', null)
      const { data, error } = await query
      if (error) { console.error('[messages fetch error]', error); return }
      setMessages((data as ChatMessage[]) ?? [])
    })()
  }, [matchTagIds, subTagId])

  // メンション候補（introMessagesのユーザー + メッセージ履歴）
  // introMessages は定数(module-level)なので deps から除外
  useEffect(() => {
    const seen = new Map<string, ChatMessageUser>()
    for (const msg of introMessages) {
      if (!seen.has(msg.user_id)) seen.set(msg.user_id, msg.users)
    }
    for (const msg of messages) {
      if (msg.users && !seen.has(msg.user_id)) seen.set(msg.user_id, msg.users)
    }
    setMentionUsers(Array.from(seen.values()))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  // リアクション取得
  useEffect(() => {
    if (messages.length === 0) return
    ;(async () => {
      const ids = messages.map(m => m.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('message_reactions') as any)
        .select('message_id, user_id, emoji')
        .in('message_id', ids)
      if (!data) return
      const map: ReactionsMap = {}
      for (const row of data as { message_id: string; user_id: string; emoji: string }[]) {
        if (!map[row.message_id]) map[row.message_id] = []
        const existing = map[row.message_id].find(r => r.emoji === row.emoji)
        if (existing) {
          existing.count++
          if (row.user_id === userId) existing.reacted = true
        } else {
          map[row.message_id].push({ emoji: row.emoji, count: 1, reacted: row.user_id === userId })
        }
      }
      setReactionsMap(map)
    })()
  }, [messages, userId])

  // 保存済みメッセージID取得
  useEffect(() => {
    if (!userId || messages.length === 0) return
    const ids = messages.map(m => m.id)
    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('saved_messages') as any)
        .select('message_id')
        .eq('user_id', userId)
        .in('message_id', ids)
      if (!data) return
      setSavedIds(new Set((data as { message_id: string }[]).map(r => r.message_id)))
    })()
  }, [messages, userId])

  // メッセージ リアルタイム
  useEffect(() => {
    const channel = supabase
      .channel(`room_${channelKey}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const row = payload.new as RealtimeRow
        if (!matchingIdsRef.current.has(row.tag_id)) return
        if ((row.sub_tag_id ?? null) !== (subTagId ?? null)) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('messages') as any)
          .select('id, content, created_at, user_id, users ( id, username, avatar_url )')
          .eq('id', row.id)
          .single()
        if (data) setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data as ChatMessage])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [channelKey, subTagId])

  // リアクション リアルタイム
  useEffect(() => {
    const channel = supabase
      .channel(`reactions_${channelKey}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, async (payload) => {
        const row = (payload.new ?? payload.old) as { message_id: string } | undefined
        if (!row?.message_id) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('message_reactions') as any)
          .select('user_id, emoji')
          .eq('message_id', row.message_id)
        if (!data) return
        const reactions: Reaction[] = []
        for (const r of data as { user_id: string; emoji: string }[]) {
          const existing = reactions.find(x => x.emoji === r.emoji)
          if (existing) {
            existing.count++
            if (r.user_id === userId) existing.reacted = true
          } else {
            reactions.push({ emoji: r.emoji, count: 1, reacted: r.user_id === userId })
          }
        }
        setReactionsMap(prev => ({ ...prev, [row.message_id]: reactions }))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [channelKey, userId])

  // 自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // 送信
  const handleSend = async () => {
    const content = input.trim()
    if (!content || !userId) return
    setInput('')
    const tagId = ownTagId ?? matchTagIds[0] ?? null
    if (!tagId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('messages') as any)
      .insert([{ tag_id: tagId, user_id: userId, content, sub_tag_id: subTagId }])
      .select('id, content, created_at, user_id')
      .single()
    if (error) { console.error('[message send error]', error); setInput(content); return }
    if (data) {
      const msg: ChatMessage = { ...(data as Omit<ChatMessage, 'users'>), users: myProfile }
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
      onMessageSent?.()
    }
  }

  // リアクション送信/削除（DBメッセージ用）
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!userId) return
    setOpenPickerMsgId(null)
    const current = reactionsMap[messageId] ?? []
    const existing = current.find(r => r.emoji === emoji)
    if (existing?.reacted) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('message_reactions') as any)
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji)
      if (error) console.error('[reaction delete error]', error)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('message_reactions') as any)
        .insert([{ message_id: messageId, user_id: userId, emoji }])
      if (error) console.error('[reaction insert error]', error)
    }
  }

  // イントロ会話（mock）へのリアクション。DBには保存せずローカルのみで切り替える
  const handleIntroReaction = (messageId: string, emoji: string) => {
    setOpenPickerMsgId(null)
    setIntroReactionsMap(prev => {
      const current = prev[messageId] ?? []
      const existing = current.find(r => r.emoji === emoji)
      if (existing?.reacted) {
        const next = current
          .map(r => r.emoji === emoji ? { ...r, count: r.count - 1, reacted: false } : r)
          .filter(r => r.count > 0)
        return { ...prev, [messageId]: next }
      }
      if (existing) {
        return { ...prev, [messageId]: current.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r) }
      }
      return { ...prev, [messageId]: [...current, { emoji, count: 1, reacted: true }] }
    })
  }

  // ブックマーク保存トグル（楽観的更新）
  const handleToggleSave = async (messageId: string, content: string) => {
    if (!userId) return
    const isSaved = savedIds.has(messageId)
    setSavedIds(prev => {
      const next = new Set(prev)
      isSaved ? next.delete(messageId) : next.add(messageId)
      return next
    })
    const tagId = ownTagId ?? matchTagIds[0] ?? null
    if (isSaved) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('saved_messages') as any)
        .delete()
        .eq('user_id', userId)
        .eq('message_id', messageId)
      if (error) {
        console.error('[save delete error]', error)
        setSavedIds(prev => { const next = new Set(prev); next.add(messageId); return next })
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('saved_messages') as any)
        .insert([{ user_id: userId, message_id: messageId, content, tag_id: tagId }])
      if (error) {
        console.error('[save insert error]', error)
        setSavedIds(prev => { const next = new Set(prev); next.delete(messageId); return next })
      }
    }
  }

  // 長押し
  const startLongPress = (msgId: string) => {
    longPressTimerRef.current = setTimeout(() => setLongPressedMsgId(msgId), 500)
  }
  const cancelLongPress = () => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null }
  }

  // ============================================================
  // ヘルパー
  // ============================================================
  const GROUP_GAP_MS = 5 * 60 * 1000

  const showDateDivider = (index: number, list: ChatMessage[]) => {
    if (index === 0) return true
    const prev = new Date(list[index - 1].created_at).toDateString()
    const curr = new Date(list[index].created_at).toDateString()
    return prev !== curr
  }

  const isFirstInGroup = (index: number, list: ChatMessage[]) => {
    if (index === 0) return true
    if (showDateDivider(index, list)) return true
    if (list[index].user_id !== list[index - 1].user_id) return true
    const gap = new Date(list[index].created_at).getTime() - new Date(list[index - 1].created_at).getTime()
    return gap > GROUP_GAP_MS
  }

  const formatDateLabel = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return '今日'
    if (d.toDateString() === yesterday.toDateString()) return '昨日'
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  // ============================================================
  // アバター描画
  // ============================================================
  const renderAvatar = (user: ChatMessageUser | null, me: boolean, fallbackId?: string) => {
    const initial = (user?.username?.[0] ?? '?').toUpperCase()
    return (
      <div
        onClick={() => {
          if (me) { router.push('/profile'); return }
          const targetId = user?.id || fallbackId
          if (!targetId) return
          if (targetId.startsWith('dummy-')) return
          if (onProfileClick) { onProfileClick(targetId); return }
          router.push(`/profile/${targetId}`)
        }}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#4A7C59', overflow: 'hidden', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#F5F0E8', fontSize: 15, fontWeight: 'bold', cursor: 'pointer',
        }}
      >
        {user?.avatar_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span>{initial}</span>
        }
      </div>
    )
  }

  // ============================================================
  // レンダリング
  // ============================================================
  // DB が 0 件かつメインチャンネル（subTagId なし）の場合、type 別デフォルトをフォールバック表示
  const fallbackMessages = messages.length === 0 && !subTagId && tagType
    ? DEFAULT_MESSAGES[tagType]
    : []
  const effectiveIntro = [...introMessages, ...fallbackMessages]
  const introIds = new Set(effectiveIntro.map(m => m.id))
  const allMessages: ChatMessage[] = [
    ...(effectiveIntro as unknown as ChatMessage[]),
    ...messages,
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F5F0E8', position: 'relative' }}>

      {/* ヘッダー */}
      <div style={{
        flexShrink: 0, padding: '12px 16px',
        borderBottom: `1px solid ${header.borderColor ?? '#D4B896'}`,
        background: '#F5F0E8', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {header.onBack && (
          <div onClick={header.onBack}
            style={{ color: header.backColor ?? '#4A7C59', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}
          >{header.backContent ?? '‹'}</div>
        )}
        {header.extra}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#3B2F1E' }}>{header.title}</div>
          {header.subtitle && <div style={{ fontSize: 11, color: '#8B6914', marginTop: 1 }}>{header.subtitle}</div>}
        </div>
      </div>

      {banner}

      {/* メッセージエリア（introMessages + messages を統合レンダリング） */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
        {allMessages.map((msg, index) => {
          const mine = msg.user_id === userId
          const isIntro = introIds.has(msg.id)
          const first = isFirstInGroup(index, allMessages)
          const user = mine ? (msg.users ?? myProfile) : msg.users
          const reactions = isIntro
            ? (introReactionsMap[msg.id] ?? [])
            : (reactionsMap[msg.id] ?? [])

          return (
            <div key={msg.id}>
              {/* 日付区切り */}
              {showDateDivider(index, allMessages) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 8px' }}>
                  <div style={{ flex: 1, height: .5, background: 'rgba(139,105,20,0.2)' }} />
                  <span style={{ fontSize: 11, color: 'rgba(139,105,20,0.55)', whiteSpace: 'nowrap' }}>
                    {formatDateLabel(msg.created_at)}
                  </span>
                  <div style={{ flex: 1, height: .5, background: 'rgba(139,105,20,0.2)' }} />
                </div>
              )}

              {/* メッセージ行 */}
              <div style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: first ? '8px 0 1px' : '1px 0',
              }}>
                {/* アバター列 */}
                <div style={{ width: 36, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                  {first && renderAvatar(user, mine, msg.user_id)}
                </div>

                {/* 本文列 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* 名前＋時刻（グループ先頭のみ） */}
                  {first && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 600,
                        color: mine ? '#4A7C59' : '#8B6914',
                      }}>{user?.username ?? (mine ? 'あなた' : '匿名')}</span>
                      <span style={{ fontSize: 11, color: '#A09070' }}>{formatTime(msg.created_at)}</span>
                    </div>
                  )}

                  {/* メッセージ本文 */}
                  <div
                    onPointerDown={() => startLongPress(msg.id)}
                    onPointerUp={cancelLongPress}
                    onPointerLeave={cancelLongPress}
                    onPointerCancel={cancelLongPress}
                    style={{ fontSize: 14, lineHeight: 1.5, color: '#3B2F1E', wordBreak: 'break-word', userSelect: 'none', WebkitUserSelect: 'none' }}
                  >
                    {msg.content.split(/(@\w+)/g).map((part, i) =>
                      /^@\w+$/.test(part)
                        ? <span key={i} style={{ color: '#4A7C59', fontWeight: 600 }}>{part}</span>
                        : part
                    )}
                  </div>

                  {/* アクション + リアクション */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                    {reactions.map(r => (
                      <button key={r.emoji}
                        onClick={() => isIntro ? handleIntroReaction(msg.id, r.emoji) : handleReaction(msg.id, r.emoji)}
                        style={{
                          background: r.reacted ? '#F5D78E' : '#FFFFFF',
                          border: `1px solid ${r.reacted ? '#8B6914' : '#D4B896'}`,
                          borderRadius: 20, padding: '2px 8px', fontSize: 12,
                          cursor: 'pointer', color: '#3B2F1E',
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}
                      >{r.emoji} <span style={{ fontSize: 11, color: '#8B6914' }}>{r.count}</span></button>
                    ))}
                    <button
                      onClick={() => { setActiveCatIndex(0); setOpenPickerMsgId(msg.id) }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
                      style={{
                        background: 'transparent', border: '1px solid rgba(139,105,20,0.25)',
                        borderRadius: 20, padding: '3px 7px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        opacity: 0.4,
                      }}
                      aria-label="リアクション"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B2F1E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                        <line x1="9" y1="9" x2="9.01" y2="9"/>
                        <line x1="15" y1="9" x2="15.01" y2="9"/>
                      </svg>
                    </button>
                    {!isIntro && (
                      <button
                        onClick={() => handleToggleSave(msg.id, msg.content)}
                        style={{
                          background: 'transparent', border: '1px solid rgba(139,105,20,0.25)',
                          borderRadius: 20, padding: '3px 7px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center',
                          opacity: savedIds.has(msg.id) ? 1 : 0.4,
                        }}
                        aria-label="保存"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={savedIds.has(msg.id) ? '#4A7C59' : 'none'} stroke={savedIds.has(msg.id) ? '#4A7C59' : '#3B2F1E'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      {!readOnly && (
        <>
          {/* メンション候補リスト */}
          {mentionQuery !== null && (() => {
            const candidates = mentionUsers.filter(u =>
              u.username.toLowerCase().startsWith(mentionQuery.toLowerCase())
            )
            if (candidates.length === 0) return null
            return (
              <div style={{
                background: '#FFFFFF', borderTop: '1px solid #D4B896',
                maxHeight: 160, overflowY: 'auto', flexShrink: 0,
              }}>
                {candidates.map(u => (
                  <div
                    key={u.id}
                    onClick={() => {
                      setInput(prev => prev.replace(/@([^\s]*)$/, `@${u.username} `))
                      setMentionQuery(null)
                    }}
                    style={{
                      padding: '10px 16px', fontSize: 14, color: '#3B2F1E',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                      borderBottom: '1px solid rgba(212,184,150,0.4)',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#4A7C59' }}>@{u.username}</span>
                  </div>
                ))}
              </div>
            )
          })()}
          <div style={{
            background: '#F5F0E8', borderTop: '1px solid #D4B896',
            padding: '10px 12px 28px', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0,
          }}>
            <input
              value={input}
              onChange={e => {
                const val = e.target.value
                setInput(val)
                const m = val.match(/@([^\s]*)$/)
                setMentionQuery(m ? m[1] : null)
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
              placeholder="メッセージを入力..."
              style={{
                flex: 1, background: '#FFFFFF', border: '1px solid #D4B896',
                borderRadius: 20, padding: '10px 16px', fontSize: 14,
                color: '#3B2F1E', outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none',
                background: input.trim() ? '#4A7C59' : 'rgba(0,0,0,0.10)',
                color: input.trim() ? '#F5F0E8' : 'rgba(0,0,0,0.3)',
                fontSize: 18, cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >›</button>
          </div>
        </>
      )}

      {/* 長押しアクションシート */}
      {longPressedMsgId && (
        <>
          <div
            onClick={() => setLongPressedMsgId(null)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(59,47,30,0.35)', zIndex: 10 }}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: '#F5F0E8', borderRadius: '20px 20px 0 0',
            borderTop: '1px solid #D4B896', zIndex: 11, paddingBottom: 32,
          }}>
            <div style={{ width: 36, height: 4, background: 'rgba(139,105,20,.25)', borderRadius: 2, margin: '10px auto 8px' }} />
            <button
              onClick={() => { setOpenPickerMsgId(longPressedMsgId); setActiveCatIndex(0); setLongPressedMsgId(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '14px 24px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 15, color: '#3B2F1E', fontWeight: 500,
              }}
            >
              <span style={{ fontSize: 22 }}>😊</span> リアクション
            </button>
          </div>
        </>
      )}

      {/* 絵文字ボトムシート */}
      {openPickerMsgId && (
        <>
          <div
            onClick={() => setOpenPickerMsgId(null)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(59,47,30,0.35)', zIndex: 10 }}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: '#F5F0E8', borderRadius: '20px 20px 0 0',
            borderTop: '1px solid #D4B896', zIndex: 11,
          }}>
            <div style={{ width: 36, height: 4, background: 'rgba(139,105,20,.25)', borderRadius: 2, margin: '10px auto 0' }} />
            <div style={{ fontSize: 13, color: '#8B6914', textAlign: 'center', padding: '8px 0 4px', fontWeight: 500 }}>
              リアクションを選ぶ
            </div>
            {/* クイック5つ */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '8px 16px 12px', borderBottom: '.5px solid rgba(139,105,20,.15)' }}>
              {QUICK_EMOJIS.map(emoji => (
                <button key={emoji}
                  onClick={() => {
                    if (introIds.has(openPickerMsgId)) handleIntroReaction(openPickerMsgId, emoji)
                    else handleReaction(openPickerMsgId, emoji)
                  }}
                  style={{ fontSize: 28, background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8 }}
                >{emoji}</button>
              ))}
            </div>
            {/* カテゴリタブ */}
            <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '.5px solid rgba(139,105,20,.15)', padding: '4px 8px 0' }}>
              {EMOJI_CATS.map((cat, i) => (
                <button key={i}
                  onClick={() => {
                    setActiveCatIndex(i)
                    document.getElementById(`cat-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  style={{
                    fontSize: 20, padding: '6px 10px', cursor: 'pointer', flexShrink: 0,
                    background: 'none', border: 'none',
                    borderBottom: activeCatIndex === i ? '2px solid #8B6914' : '2px solid transparent',
                  }}
                >{cat.icon}</button>
              ))}
            </div>
            {/* 絵文字グリッド */}
            <div
              ref={gridRef}
              style={{ height: 220, overflowY: 'auto', padding: '4px 12px 32px' }}
              onScroll={() => {
                EMOJI_CATS.forEach((_, i) => {
                  const el = document.getElementById(`cat-${i}`)
                  if (el && gridRef.current) {
                    const rect = el.getBoundingClientRect()
                    const parentRect = gridRef.current.getBoundingClientRect()
                    if (rect.top <= parentRect.top + 40) setActiveCatIndex(i)
                  }
                })
              }}
            >
              {EMOJI_CATS.map((cat, catIdx) => (
                <div key={catIdx} id={`cat-${catIdx}`}>
                  <div style={{ fontSize: 11, color: '#8B6914', fontWeight: 500, padding: '8px 0 4px' }}>{cat.label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2 }}>
                    {cat.emojis.map(emoji => (
                      <button key={emoji}
                        onClick={() => {
                          if (introIds.has(openPickerMsgId)) handleIntroReaction(openPickerMsgId, emoji)
                          else handleReaction(openPickerMsgId, emoji)
                        }}
                        style={{ fontSize: 22, textAlign: 'center', padding: '4px 0', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer' }}
                      >{emoji}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {overlay}
    </div>
  )
}
