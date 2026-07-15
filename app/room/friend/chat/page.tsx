'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { UserAvatar } from '@/src/components/UserAvatar'
import { createVideoRoom, parseScheduled, openUrl, detectDates, mayContainDate, scheduleBooking, type DateMatch } from '@/src/lib/videoRoom'
import FirstVisitCoach from '@/src/components/tutorial/FirstVisitCoach'
import PCRightSidebar from '@/src/components/PCRightSidebar'
import RoomModeTabs from '@/src/components/room/RoomModeTabs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// 検出結果を friend_messages.metadata に保存する（UPDATE）
async function saveDateMatches(msgId: string, userId: string, dates: DateMatch[]): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/friend_messages?id=eq.${msgId}`, {
    method: 'PATCH',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'x-user-id': userId,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ metadata: { dates } }),
  })
}
import { YUKI_ID, buildYukiMockMessages } from '@/src/lib/mockYuki'

type ChatUser = { id: string; username: string; avatar_url: string | null }
type Message = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  // 'text'（通常） / 'video_room'（通話カード） / 'video_scheduled'（予定カード）
  type?: string
  metadata?: { date?: string; time?: string; method?: string; dates?: DateMatch[] } | null
  sender?: ChatUser | null
}

// 希望する手段バッジ（Rescueからの遷移時にクエリで渡される）
const WANT_META: Record<string, { icon: string; label: string }> = {
  call: { icon: '📞', label: '通話' },
  meet: { icon: '☕', label: '会って話す' },
  chat: { icon: '💬', label: 'チャット' },
}

const formatDateLabel = (iso: string): string => {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return '今日'
  if (d.toDateString() === yesterday.toDateString()) return '昨日'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const shouldShowDateDivider = (messages: Message[], index: number): boolean => {
  if (index === 0) return true
  const prev = new Date(messages[index - 1].created_at).toDateString()
  const curr = new Date(messages[index].created_at).toDateString()
  return prev !== curr
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// メッセージ本文中の日時表現を青文字リンクにする
function renderWithDateLinks(
  content: string,
  matches: DateMatch[] | undefined,
  mine: boolean,
  onClick: (m: DateMatch) => void,
): React.ReactNode {
  if (!matches || matches.length === 0) return content
  const byText = new Map(matches.map(m => [m.text, m]))
  const re = new RegExp(`(${matches.map(m => escapeReg(m.text)).join('|')})`, 'g')
  const parts = content.split(re)
  const linkColor = mine ? '#CDE8FF' : '#185FA5'
  return parts.map((part, i) => {
    const m = byText.get(part)
    if (!m) return part
    return (
      <span
        key={i}
        onClick={() => onClick(m)}
        style={{ color: linkColor, textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}
      >
        {part}
      </span>
    )
  })
}

function FriendChatContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const friendId = searchParams.get('friendId') ?? ''
  // Rescue応答からの遷移時に渡される表示情報・初期メッセージ
  const nameParam = searchParams.get('name') ?? ''
  const tagParam = searchParams.get('tag') ?? ''
  const wantParam = searchParams.get('want') ?? ''
  const presetParam = searchParams.get('preset') ?? ''

  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [friend, setFriend] = useState<ChatUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  // 初期メッセージをプリセット（自動送信ではなく入力欄に投入）
  const [input, setInput] = useState(presetParam)
  // ビデオ通話・予定登録
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // 日付リンク：確認モーダル対象
  const [dateModal, setDateModal] = useState<DateMatch | null>(null)
  const detectedRef = useRef<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    ;(async () => {
      const uid = localStorage.getItem('user_id')
      if (!uid || !friendId) {
        setLoading(false)
        return
      }
      setMyUserId(uid)

      // モックユーザー Yuki：Supabaseクエリを待たずに、表示専用のモック履歴を先にセットする
      const mock = friendId === YUKI_ID ? (buildYukiMockMessages(uid) as Message[]) : []
      if (mock.length > 0) {
        setMessages(mock)
        setLoading(false)
      }

      const [friendRes, messagesRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('users') as any)
          .select('id, username, avatar_url')
          .eq('id', friendId)
          .single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('friend_messages') as any)
          .select('*, sender:users!sender_id(id, username, avatar_url)')
          .or(`and(sender_id.eq.${uid},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${uid})`)
          .order('created_at', { ascending: true }),
      ])

      if (cancelled) return
      const friendUser = (friendRes.data as ChatUser) ?? null
      setFriend(friendUser)
      const realMessages = (messagesRes.data as Message[]) ?? []
      // モック（Yukiの表示専用履歴）の後ろに、実際に送受信したメッセージを続ける
      setMessages([...mock, ...realMessages])
      setLoading(false)

      // このチャットを開いた時刻を記録（チャット一覧の未読判定に使用）
      localStorage.setItem(`chat_seen_${friendId}`, new Date().toISOString())

      // Realtime購読：相手からの新着メッセージを受信
      channel = supabase
        .channel(`friend_chat_${friendId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_messages',
          filter: `receiver_id=eq.${uid}`,
        }, (payload) => {
          const row = payload.new as Message
          if (row.sender_id !== friendId) return
          const withSender = { ...row, sender: friendUser }
          setMessages(prev => (prev.some(m => m.id === row.id) ? prev : [...prev, withSender]))
          // 受信メッセージの日付検出（metadata.dates がまだなければ実行）
          if ((row.type ?? 'text') === 'text' && !row.metadata?.dates && mayContainDate(row.content) && !detectedRef.current.has(row.id)) {
            detectedRef.current.add(row.id)
            detectDates(uid, row.content).then(matches => {
              if (matches.length > 0) {
                saveDateMatches(row.id, uid, matches)
                setMessages(prev => prev.map(p =>
                  p.id === row.id ? { ...p, metadata: { ...(p.metadata ?? {}), dates: matches } } : p,
                ))
              }
            })
          }
        })
        .subscribe()
    })()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [friendId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // 初回ロード時：metadata.datesを持たないテキストメッセージを非同期で検出・保存する
  // （送信後に保存した新着は detectedRef で二重処理を防ぐ）
  useEffect(() => {
    if (!myUserId) return
    const targets = messages.filter(m =>
      (m.type ?? 'text') === 'text' &&
      !m.metadata?.dates &&          // DB に dates がまだ保存されていない
      !detectedRef.current.has(m.id) &&
      mayContainDate(m.content),
    )
    if (targets.length === 0) return
    targets.forEach(m => detectedRef.current.add(m.id))
    ;(async () => {
      for (const m of targets) {
        const matches = await detectDates(myUserId, m.content)
        if (matches.length > 0) {
          await saveDateMatches(m.id, myUserId, matches)
          // ローカルの state も即座に更新（次回ロード前でもリンクを表示するため）
          setMessages(prev => prev.map(p =>
            p.id === m.id ? { ...p, metadata: { ...(p.metadata ?? {}), dates: matches } } : p,
          ))
        }
      }
    })()
  }, [messages, myUserId])

  const handleSend = async () => {
    const content = input.trim()
    if (!content || !myUserId || !friendId) return
    setInput('')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('friend_messages') as any)
      .insert({ sender_id: myUserId, receiver_id: friendId, content })
      .select('*, sender:users!sender_id(id, username, avatar_url)')
      .single()

    if (!error && data) {
      const row = data as Message
      setMessages(prev => (prev.some(m => m.id === row.id) ? prev : [...prev, row]))
      // 送信直後に日付検出・DB保存（detectedRefに登録して初回ロードのuseEffectと二重にならないよう防ぐ）
      if (mayContainDate(content)) {
        detectedRef.current.add(row.id)
        const matches = await detectDates(myUserId, content)
        if (matches.length > 0) {
          await saveDateMatches(row.id, myUserId, matches)
          setMessages(prev => prev.map(p =>
            p.id === row.id ? { ...p, metadata: { ...(p.metadata ?? {}), dates: matches } } : p,
          ))
        }
      }
    }
  }

  // カード系メッセージ（通話ルーム・予定）を送信する
  const sendCardMessage = async (
    type: 'video_room' | 'video_scheduled',
    content: string,
    metadata?: Record<string, unknown>,
  ) => {
    if (!myUserId || !friendId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('friend_messages') as any)
      .insert({ sender_id: myUserId, receiver_id: friendId, content, type, metadata: metadata ?? null })
      .select('*, sender:users!sender_id(id, username, avatar_url)')
      .single()
    if (!error && data) {
      const row = data as Message
      setMessages(prev => (prev.some(m => m.id === row.id) ? prev : [...prev, row]))
    }
  }

  // 🎥 ビデオ通話：ルーム発行→通話カード送信→記録の予定に「今から」登録→ブラウザで開く
  const handleVideoCall = async () => {
    if (!myUserId || !friendId || creatingRoom) return
    setCreatingRoom(true)

    // STEP 1: ルームURLを発行（Edge Functionが1時間以内の同ペアルームは再利用）
    const url = await createVideoRoom(myUserId, friendId)
    if (!url) {
      showToast('接続できませんでした')
      setCreatingRoom(false)
      return
    }

    // STEP 2: 通話カードをチャットに送信
    await sendCardMessage('video_room', url)

    // STEP 3: 記録タブの予定にも「今から」として登録（bookings）
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`
    await scheduleBooking(myUserId, friendId, date, time, 'video')

    // URLを開く（ネイティブ=Capacitor Browser / Web=新規タブ）
    await openUrl(url)
    setCreatingRoom(false)
  }

  // 予定を登録：予約(bookings)＋チャットに予定カード（記録タブの「予定」にも反映）
  const registerSchedule = async (date: string, time: string, method: string) => {
    if (!myUserId || !friendId) return
    await scheduleBooking(myUserId, friendId, date, time, method)
    await sendCardMessage('video_scheduled', '予定を登録しました', { date, time, method })
  }

  // 日付リンクの確認モーダルから（手段は常に 'video' 固定）
  const handleDateRegister = async (date: string, time: string) => {
    setDateModal(null)
    await registerSchedule(date, time, 'video')
  }

  if (loading) {
    return (
      <div className="md:max-w-none!" style={{ background: '#F5F0E8', maxWidth: 390, margin: '0 auto', minHeight: '100svh' }}>
        <p style={{ textAlign: 'center', paddingTop: 80, fontSize: 13, color: '#A09070' }}>読み込み中...</p>
      </div>
    )
  }

  return (
    // 中央にプライベートチャット、右にフレンド一覧（DM）サイドバーを常時表示。スマホは単一カラム。
    <div className="md:flex md:items-start">
      {/* PC：上部にモードタブ（Daisy/Seed/Private）を維持し、その下にチャットを全画面表示 */}
      <div className="md:flex-1 md:min-w-0 md:flex md:flex-col md:h-[calc(100svh-56px)]">
        <RoomModeTabs active="friend" className="md:mr-[280px]!" />
    <div
      // PC：flex-1 で全幅に伸ばす。inline の margin:'0 auto' が残す左右 auto マージンは
      // flex の stretch を無効化して幅が縮む（＝メッセージが縦長に）ため md:ml-0! で解除し、
      // 右は md:mr-[280px]! で DM サイドバー分を確保する。
      className="flex flex-col md:max-w-none! md:h-auto! md:flex-1 md:min-h-0 md:ml-0! md:mr-[280px]!"
      style={{ height: '100svh', maxWidth: 390, margin: '0 auto', background: '#F5F0E8' }}
    >
      {/* Header */}
      <div style={{
        flexShrink: 0, padding: 'calc(16px + env(safe-area-inset-top)) 20px 16px',
        borderBottom: '1px solid #D4B896',
        background: '#F5F0E8',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => router.back()}
          className="md:hidden"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8B6914', lineHeight: 1, padding: 0, flexShrink: 0 }}
        >‹</button>
        <div
          onClick={() => router.push(`/profile/view?userId=${friendId}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1, minWidth: 0 }}
        >
          <UserAvatar username={nameParam || friend?.username} avatarUrl={friend?.avatar_url} size={36} />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>
              {nameParam || friend?.username}
            </p>
            {/* 悩みタグ＋希望手段バッジ（Rescueからの遷移時） */}
            {(tagParam || WANT_META[wantParam]) && (
              <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                {tagParam && (
                  <span style={{
                    background: '#F3D2CC', color: '#B23A2A',
                    borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 600,
                  }}>#{tagParam}</span>
                )}
                {WANT_META[wantParam] && (
                  <span style={{
                    background: '#FBEFC6', color: '#8B6914',
                    borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 600,
                  }}>{WANT_META[wantParam].icon} {WANT_META[wantParam].label}</span>
                )}
              </div>
            )}
          </div>
        </div>
        {/* 🎥 ビデオ通話 */}
        <button
          onClick={handleVideoCall}
          disabled={creatingRoom}
          aria-label="ビデオ通話"
          style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            border: '1px solid #D4B896', background: '#FFFFFF',
            fontSize: 17, cursor: creatingRoom ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: creatingRoom ? 0.5 : 1,
          }}
        >
          🎥
        </button>
      </div>


      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.map((msg, index) => {
          const mine = msg.sender_id === myUserId
          return (
            <div key={msg.id}>
              {shouldShowDateDivider(messages, index) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 8px' }}>
                  <div style={{ flex: 1, height: .5, background: 'rgba(139,105,20,0.2)' }} />
                  <span style={{ fontSize: 11, color: 'rgba(139,105,20,0.55)', whiteSpace: 'nowrap' }}>
                    {formatDateLabel(msg.created_at)}
                  </span>
                  <div style={{ flex: 1, height: .5, background: 'rgba(139,105,20,0.2)' }} />
                </div>
              )}
              <div
                style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}
              >
                {!mine && (
                  <UserAvatar
                    username={msg.sender?.username}
                    avatarUrl={msg.sender?.avatar_url}
                    size={32}
                    onClick={() => router.push(`/profile/view?userId=${msg.sender_id}`)}
                  />
                )}
                {msg.type === 'video_room' ? (
                  /* 通話カード（送信側=開始しました / 受信側=招待されました） */
                  <div style={{
                    maxWidth: '78%', padding: '14px',
                    borderRadius: 16, background: '#FBF7EE',
                    border: '1px solid #E0D5BE',
                  }}>
                    <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#3B2F1E' }}>
                      🎥 {mine ? 'ビデオ通話を開始しました' : 'ビデオ通話に招待されました'}
                    </p>
                    <button
                      onClick={() => openUrl(msg.content)}
                      style={{
                        width: '100%', padding: '9px 0', borderRadius: 20, border: 'none',
                        background: 'linear-gradient(135deg, #F6D06B 0%, #E0A020 100%)',
                        color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      入室する
                    </button>
                  </div>
                ) : msg.type === 'video_scheduled' ? (
                  /* 予定カード（青いバー＋完了表示） */
                  (() => {
                    // metadata優先、なければcontentのJSONから
                    const meta = (msg.metadata as { date?: string; time?: string } | null) ?? null
                    const p = (meta?.date ? { date: meta.date, time: meta.time ?? '' } : parseScheduled(msg.content))
                    return (
                      <div style={{
                        maxWidth: '78%', borderRadius: 16, overflow: 'hidden',
                        background: '#FBF7EE', border: '1px solid #E0D5BE',
                      }}>
                        <div style={{ display: 'flex' }}>
                          <div style={{ width: 5, background: '#185FA5', flexShrink: 0 }} />
                          <div style={{ padding: '12px 14px' }}>
                            <p style={{ margin: '0 0 5px', fontSize: 13, fontWeight: 700, color: '#3B2F1E' }}>
                              📅 ビデオ通話の予定を登録しました
                            </p>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#185FA5' }}>
                              {p ? `${p.date.replace(/^\d+-0?(\d+)-0?(\d+)$/, '$1/$2')}（${['日','月','火','水','木','金','土'][new Date(`${p.date}T00:00:00`).getDay()]}）${p.time ? ` ${p.time}〜` : ''}` : msg.content}
                            </p>
                            <p style={{ margin: '5px 0 0', fontSize: 10, color: 'rgba(59,47,30,0.45)' }}>
                              記録タブの「予定」から入室できます
                            </p>
                          </div>
                        </div>
                        <div style={{
                          borderTop: '1px solid #E0D5BE', padding: '7px 14px',
                          fontSize: 11, fontWeight: 600, color: '#4A7C59',
                        }}>
                          ✓ 予定タブに追加済み
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  <div style={{
                    maxWidth: '72%', padding: '10px 14px',
                    borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: mine ? '#4A7C59' : '#F5F0E8',
                    color: mine ? '#F5F0E8' : '#3B2F1E',
                    border: mine ? 'none' : '1px solid #D4B896',
                    fontSize: 14, lineHeight: 1.5,
                  }}>
                    <p style={{ margin: 0 }}>
                      {renderWithDateLinks(msg.content, msg.metadata?.dates, mine, setDateModal)}
                    </p>
                  </div>
                )}
                {mine && (
                  <UserAvatar
                    username={msg.sender?.username}
                    avatarUrl={msg.sender?.avatar_url}
                    size={32}
                    onClick={() => router.push(`/profile/view?userId=${msg.sender_id}`)}
                  />
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        flexShrink: 0, padding: '10px 16px calc(16px + env(safe-area-inset-bottom))',
        display: 'flex', gap: 10, alignItems: 'center',
        borderTop: '1px solid #D4B896', background: '#F5F0E8',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
          placeholder="メッセージを入力..."
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 20,
            border: '1.5px solid #D4B896', outline: 'none',
            fontSize: 16, color: '#3B2F1E', background: '#FFFFFF',
          }}
        />
        <button
          onClick={handleSend}
          style={{
            width: 38, height: 38, borderRadius: '50%', border: 'none',
            background: input.trim() ? '#4A7C59' : 'rgba(139,105,20,0.12)',
            color: input.trim() ? '#F5F0E8' : 'rgba(139,105,20,0.35)',
            fontSize: 16, cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >›</button>
      </div>

      {/* 日付リンクの確認モーダル */}
      {dateModal && (
        <DateConfirmModal
          match={dateModal}
          partnerName={nameParam || friend?.username || '相手'}
          onClose={() => setDateModal(null)}
          onSubmit={handleDateRegister}
        />
      )}

      {/* トースト */}
      {toast && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 'calc(90px + env(safe-area-inset-bottom))',
          transform: 'translateX(-50%)', zIndex: 600,
          background: 'rgba(59,47,30,0.92)', color: '#F5F0E8',
          fontSize: 13, fontWeight: 600, padding: '10px 18px', borderRadius: 20,
          whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
        }}>
          {toast}
        </div>
      )}

      {/* ── 初回チャット時の説明（予定の保存機能） ── */}
      <FirstVisitCoach
        storageKey="coach_chat_save_v1"
        heading="チャットの使い方"
        lines={[
          { icon: '🎥', title: 'ビデオ通話', desc: '右上のカメラから、その場でビデオ通話を始められます。' },
          { icon: '🔗', title: '日時の自動保存', desc: '「明日の21時」など日時を含むメッセージは青いリンクになります。タップすると予定として保存できます。' },
          { icon: '🕐', title: '予定の確認', desc: '保存した予定は「記録」タブからいつでも確認できます。' },
        ]}
      />
    </div>
      </div>

      <PCRightSidebar state={{ type: 'friends' }} activeFriendId={friendId} />
    </div>
  )
}

// ── 日付リンクの確認モーダル（日時表示＋1ボタン登録） ──
function DateConfirmModal({ match, partnerName, onClose, onSubmit }: {
  match: DateMatch
  partnerName: string
  onClose: () => void
  onSubmit: (date: string, time: string) => void
}) {
  const [time, setTime] = useState(match.time || '21:00')

  const TIMES: string[] = []
  for (let h = 8; h <= 23; h++) {
    TIMES.push(`${String(h).padStart(2, '0')}:00`, `${String(h).padStart(2, '0')}:30`)
  }
  const d = new Date(`${match.date}T00:00:00`)
  const dateLabel = `${d.getMonth() + 1}/${d.getDate()}（${['日', '月', '火', '水', '木', '金', '土'][d.getDay()]}）${time}`

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(59,47,30,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 300, background: '#F5F0E8', borderRadius: 20, padding: '22px 18px' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#3B2F1E', margin: '0 0 16px', textAlign: 'center' }}>
          📅 予定を登録
        </p>

        {/* 相手 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
          <span style={{ color: 'rgba(59,47,30,0.55)' }}>相手</span>
          <span style={{ fontWeight: 700, color: '#3B2F1E' }}>{partnerName}</span>
        </div>

        {/* 日時（時間は編集可能） */}
        <div style={{ fontSize: 13, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ color: 'rgba(59,47,30,0.55)' }}>日時</span>
            <span style={{ fontWeight: 700, color: '#185FA5' }}>{dateLabel}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(59,47,30,0.55)' }}>時間を変更</span>
            <select
              value={time}
              onChange={e => setTime(e.target.value)}
              style={{
                padding: '6px 10px', borderRadius: 10, border: '1px solid #D4B896',
                background: '#FFFFFF', fontSize: 13, color: '#3B2F1E', outline: 'none',
              }}
            >
              {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={() => onSubmit(match.date, time)}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 24, border: 'none',
            background: '#4A7C59', color: '#F5F0E8', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          この時間で登録する
        </button>
      </div>
    </div>
  )
}

export default function FriendChatPage() {
  return (
    <Suspense fallback={null}>
      <FriendChatContent />
    </Suspense>
  )
}
