'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { UserAvatar } from '@/src/components/UserAvatar'
import { createVideoRoom, parseScheduled, detectDates, mayContainDate, scheduleBooking, type DateMatch } from '@/src/lib/videoRoom'
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
import { isMockId, ensureThread, getThread, addMessage, addMockReply, seedMessages, type MockChatMessage } from '@/src/lib/mockChat'
import ComeOnMap from '@/src/components/comeon/ComeOnMap'
import ComeOnTimer from '@/src/components/comeon/ComeOnTimer'
import ComeOnFinish from '@/src/components/comeon/ComeOnFinish'
import VideoCallOverlay from '@/src/components/VideoCallOverlay'

// Edge Function でルームを発行できない場合（未対応環境・モック相手など）に使う
// 固定のデモルーム。iframe 埋め込みで通話UIを表示できる。
const DEMO_ROOM_URL = 'https://daime.daily.co/demo'

// ── Come on（対面）チャット用のモック設定 ──
// 相手（HELP側）の固定モック座標。距離・希望時間は URL パラメータ（dist / minutes）で受け取り、
// 無ければ既定値にフォールバックする。
const COMEON_MOCK = { lat: 35.6595, lng: 139.7006 }
// 希望時間（分）を「30分 / 1時間 / 1時間30分」の日本語表記にする
function formatMinutes(min: number): string {
  if (min < 60) return `${min}分`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}時間` : `${h}時間${m}分`
}
// HELP側（あおい）＝会いたい相手からの依頼（希望時間を差し込む）
const buildComeOnHelpMsg = (min: number) =>
  `はじめまして。${formatMinutes(min)}ほどお時間あれば、会って話させてもらえませんか？🌿`
// Rescue側（natsuki）＝自分の承諾あいさつ
const COMEON_RESCUE_MSG = 'はじめまして！よかったら話しましょう！'
// 承認後、チャットで話しかけたときに相手（あおい）が返す定型文
const COMEON_REPLIES = [
  'ありがとうございます…！お会いできて嬉しいです。',
  'すぐ近くにいます。どのあたりで待ち合わせましょうか？',
  '緊張しますが、少しだけ話を聞いてもらえたら嬉しいです🌱',
]

// システムメッセージ（中央寄せのグレー吹き出し）の送信者ID。相手でも自分でもない。
const SYSTEM_ID = 'system'
// 到着フローの定型文
const RESCUE_ARRIVE_MSG = '到着しました！よろしくお願いします🌿' // Rescue側（自分）が到着
const HELP_ARRIVE_MSG = 'お待ちしています！🌿'                     // HELP側（相手・モック3秒後）
// タイマー終了時のシステムメッセージ
const TIMER_END_SYSTEM_MSG = 'お時間になりました。ありがとうございました🌿'

type ChatUser = { id: string; username: string; avatar_url: string | null }
type Connection = { status: string; requester_id: string; receiver_id: string }
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

// モックスレッドのメッセージを画面用 Message に変換する。
// 相手（friendId）の発言は左側にアバターを出すため sender を付与する。
function mockToMessage(m: MockChatMessage, friendId: string, name: string, avatarUrl: string | null): Message {
  return {
    ...m,
    sender: m.sender_id === friendId ? { id: friendId, username: name, avatar_url: avatarUrl } : null,
  }
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
  // autosend=1（Talk me からの遷移）のときは preset を入力欄ではなく自動送信する
  const autosend = searchParams.get('autosend') === '1'
  // type=comeon（Come on / 対面）のときは上部に地図エリア＋「終了する」導線を表示する。
  // Talk me（通話/チャット）では地図を出さない。
  const isComeOn = searchParams.get('type') === 'comeon'
  // Come on：Rescueカードから渡される希望時間（分）と距離ラベル（例 "1.2km"）
  const comeonMinutes = Number(searchParams.get('minutes')) || 30
  const comeonDist = searchParams.get('dist') || '1.2km'
  // HELP側（会いたい相手）の座標。無ければ固定モック座標にフォールバック。
  const comeonLat = Number(searchParams.get('lat')) || COMEON_MOCK.lat
  const comeonLng = Number(searchParams.get('lng')) || COMEON_MOCK.lng

  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [friend, setFriend] = useState<ChatUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  // つながり状態（pending=承認待ち / accepted=承認済み / rejected=辞退）
  const [conn, setConn] = useState<Connection | null>(null)
  const [connActing, setConnActing] = useState(false)
  // 初期メッセージ：autosend時は自動送信するので入力欄は空、それ以外は入力欄に投入
  const [input, setInput] = useState(autosend ? '' : presetParam)
  const autoSentRef = useRef(false)
  // ビデオ通話・予定登録
  const [creatingRoom, setCreatingRoom] = useState(false)
  // アプリ内ビデオ通話画面に表示するルームURL（null=非表示）
  const [callUrl, setCallUrl] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // ── Come on（対面）セッションの進行状態 ──
  // coPhase: 上部エリアの表示（'map'=地図 → 'timer'=カウントダウン）
  // rescueArrived/helpArrived: 双方の「到着しました」。両者揃うとタイマー開始。
  // secondsLeft/timerDone: カウントダウン残り秒と終了フラグ。
  // finishOpen: 終了後の写真画面（モーダル）。
  const [coPhase, setCoPhase] = useState<'map' | 'timer'>('map')
  const [rescueArrived, setRescueArrived] = useState(false)
  const [helpArrived, setHelpArrived] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [timerDone, setTimerDone] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  // 日付リンク：確認モーダル対象
  const [dateModal, setDateModal] = useState<DateMatch | null>(null)
  const detectedRef = useRef<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)
  // タイマー終了処理の二重発火防止（手動終了とカウント0が同時に起きても1回だけ）
  const timerEndedRef = useRef(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null
    let connChannel: ReturnType<typeof supabase.channel> | null = null

    ;(async () => {
      const uid = localStorage.getItem('user_id')
      if (!uid || !friendId) {
        setLoading(false)
        return
      }
      setMyUserId(uid)

      // モックユーザー（mock-*：あおい/けんた/さくら 等）：Supabase を使わず
      // localStorage のスレッドから読み込み、送受信・自動返信をクライアント側で完結させる。
      // スレッドが無ければここで生成する（直接URLで開いたときのフォールバック）。
      if (isMockId(friendId)) {
        const thread = ensureThread({
          friendId,
          name: nameParam || 'ゲスト',
          tag: tagParam,
          replies: isComeOn ? COMEON_REPLIES : undefined,
        })
        // Come on：承認直後の自動メッセージ2件を必ず時系列順で表示する。
        //   1件目＝HELP側（あおい）の依頼   … Come onリクエスト送信時に送られたもの
        //   2件目＝Rescue側（natsuki）の承諾 … 承認時に送られたもの
        // 固定IDで冪等（再訪しても二重挿入しない）。既存スレッドがあっても、
        // 既存メッセージより前のタイムスタンプで差し込むので必ず先頭2件になる。
        if (isComeOn) {
          const earliest = thread.messages.length > 0
            ? Math.min(...thread.messages.map(m => new Date(m.created_at).getTime()))
            : Date.now()
          seedMessages(friendId, [
            { id: 'comeon-help-001', sender_id: friendId, receiver_id: uid, content: buildComeOnHelpMsg(comeonMinutes), created_at: new Date(earliest - 2000).toISOString() },
            { id: 'comeon-rescue-001', sender_id: uid, receiver_id: friendId, content: COMEON_RESCUE_MSG, created_at: new Date(earliest - 1000).toISOString() },
          ])
        }
        const seeded = getThread(friendId) ?? thread
        setFriend({ id: friendId, username: seeded.name, avatar_url: seeded.avatarUrl })
        setConn(null)
        setMessages(seeded.messages.map(m => mockToMessage(m, friendId, seeded.name, seeded.avatarUrl)))
        setLoading(false)
        localStorage.setItem(`chat_seen_${friendId}`, new Date().toISOString())
        return // Supabase クエリ・Realtime 購読は行わない
      }

      // モックユーザー Yuki：Supabaseクエリを待たずに、表示専用のモック履歴を先にセットする
      const mock = friendId === YUKI_ID ? (buildYukiMockMessages(uid) as Message[]) : []
      if (mock.length > 0) {
        setMessages(mock)
        setLoading(false)
      }

      const [friendRes, messagesRes, connRes] = await Promise.all([
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('connections') as any)
          .select('status, requester_id, receiver_id')
          .or(`and(requester_id.eq.${uid},receiver_id.eq.${friendId}),and(requester_id.eq.${friendId},receiver_id.eq.${uid})`)
          .maybeSingle(),
      ])

      if (cancelled) return
      const friendUser = (friendRes.data as ChatUser) ?? null
      setFriend(friendUser)
      setConn((connRes.data as Connection) ?? null)
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

      // Realtime購読：つながり状態の変化を受信（承認/辞退がリアルタイムで反映される）。
      // 承認時の自動メッセージは上の friend_messages 購読で届くため、ここでは status のみ更新。
      connChannel = supabase
        .channel(`conn_${friendId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'connections',
        }, (payload) => {
          const row = payload.new as Connection
          const involved =
            (row.requester_id === uid && row.receiver_id === friendId) ||
            (row.requester_id === friendId && row.receiver_id === uid)
          if (involved) setConn({ status: row.status, requester_id: row.requester_id, receiver_id: row.receiver_id })
        })
        .subscribe()
    })()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
      if (connChannel) supabase.removeChannel(connChannel)
    }
    // friendId が変わったときだけ再ロードする（nameParam/tagParam は同一遷移内で不変）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendId])

  // ── つながり状態の5秒ポーリング（Realtime未設定でも承認/辞退が反映されるようにする暫定対応）──
  // connections をパブリケーションに追加していない環境でも、ワーカーの承認/辞退が
  // 最大5秒でシーカー側に反映される。上の Realtime 購読と併用（先に届いた方が反映）。
  useEffect(() => {
    if (!myUserId || !friendId || isMockId(friendId)) return
    const fetchConn = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('connections') as any)
        .select('status, requester_id, receiver_id')
        .or(`and(requester_id.eq.${myUserId},receiver_id.eq.${friendId}),and(requester_id.eq.${friendId},receiver_id.eq.${myUserId})`)
        .maybeSingle()
      if (data) setConn(data as Connection)
    }
    const id = setInterval(fetchConn, 5000)
    return () => clearInterval(id)
  }, [myUserId, friendId])

  // ── モックスレッドのライブ更新 ──
  // 承認時の自動返信は 100〜300ms 遅れて localStorage に追加される（別ページの setTimeout
  // が SPA 内で発火する）。'mockchat-updated' を購読して、その追加を画面に即反映する。
  useEffect(() => {
    if (!isMockId(friendId) || !myUserId) return
    const refresh = () => {
      const thread = getThread(friendId)
      if (!thread) return
      setMessages(thread.messages.map(m => mockToMessage(m, friendId, thread.name, thread.avatarUrl)))
    }
    window.addEventListener('mockchat-updated', refresh)
    return () => window.removeEventListener('mockchat-updated', refresh)
  }, [friendId, myUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // ── Come on（対面）：メッセージ追加ヘルパー ──
  // モック（mock-*）は localStorage スレッドへ addMessage（'mockchat-updated' で画面反映）。
  // 実データは friend_messages を経由せず、その場のローカル state にだけ積む（表示専用の進行）。
  const pushComeOnMsg = (senderId: string, receiverId: string, content: string) => {
    if (isMockId(friendId)) {
      addMessage(friendId, senderId, receiverId, content)
      return
    }
    setMessages(prev => [...prev, {
      id: `co-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender_id: senderId, receiver_id: receiverId, content,
      created_at: new Date().toISOString(), type: 'text',
      sender: senderId === friendId ? friend : null,
    }])
  }

  // Rescue側（自分）が「到着しました」を押す。
  //   → 自分の到着メッセージ → 3秒後に相手（HELP側・モック）も到着＆返信。
  const handleArrive = () => {
    if (rescueArrived) return
    setRescueArrived(true)
    pushComeOnMsg(myUserId ?? SYSTEM_ID, friendId, RESCUE_ARRIVE_MSG)
    // モック：相手は3秒後に自動で「到着」ボタンを押した想定
    setTimeout(() => {
      setHelpArrived(true)
      pushComeOnMsg(friendId, myUserId ?? '', HELP_ARRIVE_MSG)
    }, 3000)
  }

  // タイマーを終了する（手動「終了」ボタン／カウントダウン0）。ref で冪等化。
  const finishTimer = () => {
    if (timerEndedRef.current) return
    timerEndedRef.current = true
    setTimerDone(true)
    setSecondsLeft(0)
    pushComeOnMsg(SYSTEM_ID, '', TIMER_END_SYSTEM_MSG)
  }

  // 両者の到着が揃ったら、地図エリア → タイマーエリアへ切り替えてカウントダウン開始。
  useEffect(() => {
    if (isComeOn && rescueArrived && helpArrived && coPhase === 'map') {
      setSecondsLeft(comeonMinutes * 60)
      setCoPhase('timer')
    }
  }, [isComeOn, rescueArrived, helpArrived, coPhase, comeonMinutes])

  // タイマーのカウントダウン（モック：1秒ごとに1減らす）。
  useEffect(() => {
    if (coPhase !== 'timer' || timerDone) return
    const id = setInterval(() => {
      setSecondsLeft(s => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [coPhase, timerDone])

  // 残り0になったら自動終了（システムメッセージ＋終了状態）。
  useEffect(() => {
    if (coPhase === 'timer' && !timerDone && secondsLeft === 0) finishTimer()
    // finishTimer は毎レンダー生成だが timerDone ガードで単発。依存に含めない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coPhase, timerDone, secondsLeft])

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

  // テキストメッセージを friend_messages に送信する（手動送信・自動送信で共通）。
  // 成否を返す。失敗時は握りつぶさず必ずログ＋トーストで可視化する。
  const sendText = async (raw: string): Promise<boolean> => {
    const content = raw.trim()
    if (!content || !myUserId || !friendId) return false

    // モック（mock-*）：localStorage に保存し、相手からの自動返信を少し遅れて追加する。
    if (isMockId(friendId)) {
      const mine = addMessage(friendId, myUserId, friendId, content)
      if (!mine) { showToast('メッセージを送信できませんでした'); return false }
      setMessages(prev => [...prev, { ...mine, sender: null }])
      // 相手からのモック返信（1.1秒後・定型文をローテーション）
      setTimeout(() => {
        const reply = addMockReply(friendId, myUserId)
        if (!reply) return
        const thread = getThread(friendId)
        setMessages(prev => prev.some(m => m.id === reply.id)
          ? prev
          : [...prev, mockToMessage(reply, friendId, thread?.name ?? nameParam, thread?.avatarUrl ?? null)])
      }, 1100)
      return true
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('friend_messages') as any)
      .insert({ sender_id: myUserId, receiver_id: friendId, content })
      .select('*, sender:users!sender_id(id, username, avatar_url)')
      .single()

    if (error || !data) {
      // 主因：receiver_id が users に存在しない（例：/help のデモ用モックの偽ID）→
      //   friend_messages.receiver_id の外部キー制約 / UUID型不一致で INSERT が失敗する。
      console.error('[friend_messages] 送信に失敗しました:', error, { sender_id: myUserId, receiver_id: friendId })
      showToast('メッセージを送信できませんでした')
      return false
    }

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
    return true
  }

  const handleSend = async () => {
    const content = input.trim()
    if (!content) return
    setInput('')
    await sendText(content)
  }

  // ── ワーカー（受信者）の承認/辞退フロー ─────────────────────────────
  // pending のリクエストに対し、ワーカー(myUserId=receiver)が判断する。
  // 承認：status→accepted＋ワーカーから自動メッセージ。辞退：status→rejected。
  // どちらも connections を更新すると Realtime でシーカー側に反映される。

  // このチャットが「自分（ワーカー）が承認待ちの相手」からのリクエストか
  const pendingForMe = !!conn && conn.status === 'pending' && conn.receiver_id === myUserId
  // 自分（シーカー）が送ったリクエストが辞退された状態か
  const rejectedForMe = !!conn && conn.status === 'rejected' && conn.requester_id === myUserId
  // 通話ボタンは承認待ちの間は無効（承認後 or つながり無しの通常チャットは有効）
  const callLocked = !!conn && conn.status === 'pending'

  const approveRequest = async () => {
    if (!myUserId || !friendId || connActing) return
    setConnActing(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('connections') as any)
      .update({ status: 'accepted' })
      .eq('requester_id', friendId)
      .eq('receiver_id', myUserId)
    setConn(prev => (prev ? { ...prev, status: 'accepted' } : prev))
    // ワーカーからの承認メッセージ（自分の送信として右側に表示）
    await sendText('お話しできます！気軽に話しかけてください🌻')
    setConnActing(false)
  }

  const declineRequest = async () => {
    if (!myUserId || !friendId || connActing) return
    setConnActing(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('connections') as any)
      .update({ status: 'rejected' })
      .eq('requester_id', friendId)
      .eq('receiver_id', myUserId)
    // 辞退はメッセージを送らず status のみ更新。シーカー側はバナーで通知され、
    // ワーカーの名前は表示されない。
    setConn(prev => (prev ? { ...prev, status: 'rejected' } : prev))
    setConnActing(false)
  }

  // Talk me（/help）からの遷移時：初期メッセージを1度だけ自動送信する。
  // 通話 → 通話依頼メッセージ、チャット → 挨拶メッセージ（内容は preset で受け取る）。
  // friend_messages にこの相手との会話がまだ1件も無いとき（＝初回）だけ送信するので、
  // リロードや再訪では二重送信されない。送信者=シーカー(自分)、受信者=ワーカー(相手)。
  useEffect(() => {
    if (!autosend || autoSentRef.current) return
    if (loading || !myUserId || !friendId) return
    // 相手が users に実在しないと friend は null になる（例：/help のデモ用モックの偽ID）。
    // その状態で送っても receiver_id の外部キー制約で必ず失敗するため、送信しない。
    if (!friend) {
      console.warn('[autosend] 相手が実在ユーザーとして解決できないため初期メッセージを送信しません:', friendId)
      return
    }
    const content = presetParam.trim()
    if (!content) return
    // 既に会話が存在する場合は自動送信しない（初回＝0件のときだけ・自分の送信として右側に表示）
    if (messages.length > 0) return
    autoSentRef.current = true
    // TODO: 決済実装 — 通話/チャット開始の課金確定はここ（または /help 側）で行う。
    // sendText は async（setState は await 後）。単発なので cascading render の懸念はない。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void sendText(content)
    // sendText / messages はレンダーごとに変わるため依存に含めない（autoSentRefで単発保証）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosend, loading, myUserId, friendId, friend, presetParam])

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

  // 🎥 ビデオ通話：ルーム発行→通話カード送信→記録の予定に「今から」登録→アプリ内通話画面へ
  const handleVideoCall = async () => {
    if (!myUserId || !friendId || creatingRoom) return
    // 承認待ちの間は通話不可（ワーカーが承認すると有効になる）
    if (callLocked) {
      showToast('相手が承認すると通話できます')
      return
    }
    setCreatingRoom(true)

    // STEP 1: ルームURLを発行（Edge Functionが1時間以内の同ペアルームは再利用）。
    // モック相手や Edge Function 未対応時は発行に失敗するため、固定デモルームにフォールバック。
    const url = (await createVideoRoom(myUserId, friendId)) ?? DEMO_ROOM_URL

    // STEP 2: 通話カードをチャットに送信（モックスレッドを除く実チャットのみ）
    if (!isMockId(friendId)) {
      await sendCardMessage('video_room', url)

      // STEP 3: 記録タブの予定にも「今から」として登録（bookings）
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`
      await scheduleBooking(myUserId, friendId, date, time, 'video')
    }

    // STEP 4: アプリ内の通話画面（iframe）を開く。終了ボタンでチャットに戻る。
    setCallUrl(url)
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
        {/* 🎥 ビデオ通話（承認待ちの間は無効表示） */}
        <button
          onClick={handleVideoCall}
          disabled={creatingRoom}
          aria-label="ビデオ通話"
          style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            border: '1px solid #D4B896', background: '#FFFFFF',
            fontSize: 17, cursor: creatingRoom || callLocked ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: creatingRoom || callLocked ? 0.4 : 1,
          }}
        >
          🎥
        </button>
      </div>

      {/* ── Come on（対面）：上部エリア（地図 → タイマー）。Talk me では表示しない。 ── */}
      {isComeOn && coPhase === 'map' && (
        <>
          <ComeOnMap
            lat={comeonLat}
            lng={comeonLng}
            distanceLabel={comeonDist}
            minutes={comeonMinutes}
          />
          {/* 地図エリア下部：到着ボタン（自分＝Rescue側）／相手の到着待ち */}
          <div style={{ flexShrink: 0, padding: '10px 16px', borderBottom: '1px solid #D4B896', background: '#FBF7EE' }}>
            {!rescueArrived ? (
              <button
                onClick={handleArrive}
                style={{
                  width: '100%', border: 'none', borderRadius: 24, padding: '12px 0', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #7CB342 0%, #558B2F 100%)',
                  color: '#FFFFFF', fontSize: 15, fontWeight: 700,
                  boxShadow: '0 3px 12px rgba(85,139,47,0.35)',
                }}
              >
                📍 到着しました
              </button>
            ) : (
              <p style={{ margin: 0, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#8B6914' }}>
                {helpArrived ? 'まもなく始まります…' : `${nameParam || friend?.username || '相手'}さんの到着を待っています…`}
              </p>
            )}
          </div>
        </>
      )}

      {/* タイマーエリア（両者到着後）。終了後は「終了して写真を撮る」ボタンを出す（Rescue側のみ）。 */}
      {isComeOn && coPhase === 'timer' && (
        <>
          <ComeOnTimer
            secondsLeft={secondsLeft}
            totalSeconds={comeonMinutes * 60}
            onEnd={finishTimer}
            ended={timerDone}
          />
          {timerDone && (
            <div style={{ flexShrink: 0, padding: '10px 16px', borderBottom: '1px solid #D4B896', background: '#FBF7EE' }}>
              <button
                onClick={() => setFinishOpen(true)}
                style={{
                  width: '100%', border: 'none', borderRadius: 24, padding: '12px 0', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #F6D06B 0%, #E0A020 100%)',
                  color: '#FFFFFF', fontSize: 15, fontWeight: 700,
                  boxShadow: '0 3px 12px rgba(224,160,32,0.35)',
                }}
              >
                📷 終了して写真を撮る
              </button>
            </div>
          )}
        </>
      )}

      {/* ── ワーカー：承認待ちリクエストの承認/辞退バナー（チャット上部） ── */}
      {pendingForMe && (
        <div style={{
          flexShrink: 0, padding: '12px 16px',
          borderBottom: '1px solid #D4B896', background: '#FBF7EE',
        }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#3B2F1E', textAlign: 'center' }}>
            {nameParam || friend?.username || '相手'}さんから話したいとリクエストが届いています
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={approveRequest}
              disabled={connActing}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 14, border: 'none',
                background: '#E2B34F', color: '#FFFFFF', fontSize: 14, fontWeight: 700,
                cursor: connActing ? 'default' : 'pointer', opacity: connActing ? 0.6 : 1,
              }}
            >
              話を聞く🌻
            </button>
            <button
              onClick={declineRequest}
              disabled={connActing}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 14, border: '1px solid #C9C2B4',
                background: '#EFEBE3', color: '#6B6355', fontSize: 14, fontWeight: 700,
                cursor: connActing ? 'default' : 'pointer', opacity: connActing ? 0.6 : 1,
              }}
            >
              今は難しい
            </button>
          </div>
        </div>
      )}

      {/* ── シーカー：辞退された場合の通知バナー（ワーカー名は表示しない） ── */}
      {rejectedForMe && (
        <div style={{
          flexShrink: 0, padding: '12px 16px',
          borderBottom: '1px solid #D4B896', background: '#F3EEE6',
        }}>
          <p style={{ margin: 0, fontSize: 12.5, color: '#6B6355', textAlign: 'center', lineHeight: 1.5 }}>
            今は対応できません。別の方に話しかけてみてください
          </p>
        </div>
      )}


      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.map((msg, index) => {
          // システムメッセージ（対面セッションの案内）は中央寄せのグレー吹き出しで表示
          if (msg.sender_id === SYSTEM_ID) {
            return (
              <div key={msg.id} style={{ textAlign: 'center', margin: '14px 0' }}>
                <span style={{
                  display: 'inline-block', background: 'rgba(139,105,20,0.1)', color: '#8B6914',
                  fontSize: 12, fontWeight: 600, padding: '7px 16px', borderRadius: 16, lineHeight: 1.5,
                }}>
                  {msg.content}
                </span>
              </div>
            )
          }
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
                      onClick={() => setCallUrl(msg.content)}
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

      {/* Come on（対面）：終了・写真画面（「お疲れさまでした🌿」＋カメラ＋送信状況→ホームへ） */}
      {isComeOn && (
        <ComeOnFinish
          open={finishOpen}
          friendName={nameParam || friend?.username || '相手'}
          onHome={() => router.push('/home/feed')}
        />
      )}

      {/* ── アプリ内ビデオ通話画面（Daily.co iframe）：終了ボタンでチャットに戻る ── */}
      {callUrl && <VideoCallOverlay url={callUrl} onClose={() => setCallUrl(null)} />}

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
