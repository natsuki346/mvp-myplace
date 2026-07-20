'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { BottomNav } from '@/src/components/BottomNav'
import { UserAvatar } from '@/src/components/UserAvatar'
import { ProfileDrawer } from '@/src/components/ProfileDrawer'
import RequestModal from '@/src/components/RequestModal'
import AppLogo from '@/src/components/AppLogo'
import HomeIntroModal from '@/src/components/tutorial/HomeIntroModal'
import ProfilePeekModal from '@/src/components/tutorial/ProfilePeekModal'
import { ensureThread, seedMessages } from '@/src/lib/mockChat'

const EDGE_FUNCTIONS_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const EDGE_FUNCTION_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
}

type WantKey = 'call' | 'meet'

// 選んだ手段に応じてチャット入力欄へプリセットする初期メッセージ
const PRESET_MESSAGES: Record<WantKey, string> = {
  call: 'こんにちは。通話で話しましょうか？',
  meet: 'こんにちは。どこで会いますか？',
}

type Me = { id: string; username: string; avatar_url: string | null }
// 希望する話し方（Rescue モックの表示用）
type WantMethod = 'call' | 'chat' | 'meet'
// connectionId / tags / want / note は Rescue モックのみで使用（実データでは未設定）。
// tags: 複数の shadow タグ / want: 希望手段 / note: 一言メモ
// isComeOn: 対面（Come on）の依頼。distance/preferredTime/lat/lng は Come on カード・地図で使用。
type Match = {
  userId: string
  username: string
  avatar_url: string | null
  tag: string
  connectionId?: string
  tags?: string[]
  want?: WantMethod
  note?: string
  isComeOn?: boolean
  distance?: number
  preferredTime?: number
  lat?: number
  lng?: number
}
type Tab = 'help' | 'rescue'
// Rescue 承認/辞退のローカル状態（userId → 状態）。MVP確認用でリロードで初期化されてよい。
type RescueStatus = 'accepted' | 'declined'

// 希望手段のアイコン＋ラベル（Rescue カード表示用）
const WANT_META: Record<WantMethod, { icon: string; label: string }> = {
  call: { icon: '📞', label: '通話' },
  chat: { icon: '💬', label: 'チャット' },
  meet: { icon: '🤝', label: '対面' },
}

// ── Rescue モックデータ（表示確認用・USE_MOCK_RESCUE で一括ON/OFF）─────────────
// Rescue タブで実マッチが0件のとき（または通信失敗時）、下記モックをフォールバック表示する。
// 動作確認後は USE_MOCK_RESCUE = false にするか、このブロックごと削除すればよい。
// ※ userId は実在しない偽ID。表示専用のため、タップしてもチャットは開始できない（openChat で弾く）。
//
// shadowタグは natsuki（ホスト）の lightタグ（＝乗り越えた経験）と意味的に対応させている：
//   natsuki の light 例: #ポジティブ思考 / #秀才と呼ばれた元バカ / #挑戦心 / #目標志向 /
//                        #前向きな行動力 / #自信に満ちた / #成長欲求旺盛 / #学びが原動力
//   → あおい・けんたは「natsuki が乗り越えた側」の悩みを今まさに抱えている、という関係。
const USE_MOCK_RESCUE = true
const RESCUE_MOCKS: Match[] = [
  // あおい：将来・自信・進路の迷い（natsuki の #目標志向 #自信に満ちた #ポジティブ思考 に対応）
  {
    userId: 'mock-aoi-001', username: 'あおい', avatar_url: null,
    tag: '将来が見えない', connectionId: 'mock-conn-aoi',
    tags: ['将来が見えない', '自信が持てない', '何がしたいかわからない'],
    want: 'chat',
    note: '最近仕事のことで頭がいっぱいで、誰かに話を聞いてほしいです',
  },
  // けんた：挫折・停滞・ネガティブ（natsuki の #秀才と呼ばれた元バカ #挑戦心 #前向きな行動力 に対応）
  {
    userId: 'mock-kenta-001', username: 'けんた', avatar_url: null,
    tag: '挫折から抜け出せない', connectionId: 'mock-conn-kenta',
    tags: ['挫折から抜け出せない', 'ネガティブ思考', '一歩踏み出せない'],
    want: 'call',
    note: '同じ経験をした人と話したくて。少し背中を押してほしいです',
  },
  // ゆい：Come on（対面）の依頼。近くにいて、直接会って話したい。
  // Talk me の2件と違い、対面バッジ＋距離＋希望時間を表示し、承認後は地図付きチャット（?type=comeon）へ。
  {
    userId: 'mock-comeon-001', username: 'ゆい', avatar_url: null,
    tag: '将来が不安', connectionId: 'mock-conn-comeon',
    tags: ['将来が不安', '一歩踏み出せない'],
    want: 'meet',
    note: 'はじめまして。30分ほどお時間あれば、会って話させてもらえませんか？🌿',
    isComeOn: true, distance: 1.2, preferredTime: 30, lat: 35.7354, lng: 139.4063,
  },
]

// Come on（対面）の承認時に取得する自分（Rescue側）のGPS座標。
// 実機では navigator.geolocation を使うが、モック確認用に固定座標を返す。
const COMEON_RESCUE_GPS = { lat: 35.7350, lng: 139.4060 }

// HELP側（あおい/けんた）が最初に送ったあいさつ（希望手段で文面が変わる）。
// Talk me の /help 側 autosend と同じ文言に揃える。承認後のチャットで「1件目」に表示される。
const HELP_OPENING: Record<WantMethod, string> = {
  call: 'こんにちは！通話で話したいです🌱',
  chat: 'こんにちは！話聞いてほしいです🌱',
  meet: 'こんにちは。会って話したいです🌿',
}
// Rescue 承認時に natsuki（＝話を聞く側）から送るあいさつ（「2件目」に表示される）
const RESCUE_APPROVE_MESSAGE = 'はじめまして！よかったら話しましょう！'
// その後、チャットで natsuki が話しかけたときに相手が返す定型文（順番に使われる）
const RESCUE_MOCK_REPLIES = [
  'ありがとうございます…！勇気を出して話してよかったです。',
  '実は最近、仕事や将来のことで頭がいっぱいで…聞いてもらえますか？',
  'そう言ってもらえるだけで、少し心が軽くなりました🌱',
]

// Come on（対面）：Come on ボタンから直接つなぐモック相手（近くにいる想定）と希望時間の選択肢。
// Lottery（近くで会える人の一覧）は廃止し、Come on はこの相手との地図付きチャットへ直行する。
const COMEON_TARGET = { userId: 'mock-aoi-001', username: 'あおい', tag: '仕事の悩み', dist: '1.2km' }
const COMEON_DURATIONS: { minutes: number; label: string }[] = [
  { minutes: 30, label: '30分' },
  { minutes: 60, label: '1時間' },
  { minutes: 90, label: '1時間30分' },
]

const TAB_META: Record<Tab, { label: string; emptyIcon: string; empty: string; hint: string }> = {
  help: {
    label: 'HELP',
    emptyIcon: '🙏',
    empty: '今は一致する相手がいません',
    hint: 'あなたの悩みを「乗り越えた経験」を持つ人が見つかると、ここに表示されます。',
  },
  rescue: {
    label: 'Rescue',
    emptyIcon: '🤝',
    empty: '今は一致する相手がいません',
    hint: 'あなたが乗り越えた経験を「今の悩み」として抱える人が見つかると、ここに表示されます。',
  },
}

export default function HomePage() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  // モード（'user'=話を聞いてほしい=HELP / 'host'=話を聞いてあげたい=Rescue）
  // 両方のタブは常に上部に表示。モードは初期の選択タブを決めるだけで、
  // もう一方のリストはタブを切り替えたときに初めて見られる。
  // 初期値はSSRと一致させるため 'help' 固定。実際のモード反映は下の useEffect で行う
  // （初期レンダーで localStorage を読むと hydration mismatch になるため）。
  // activeTab = いま見ているタブ / mode = 実際に選んでいるモード（永続）。
  // 自分のモードでないタブを開いたときは一覧を出さず「切り替えボタン」を表示する。
  const [activeTab, setActiveTab] = useState<Tab>('help')
  const [mode, setMode] = useState<'user' | 'host'>('user')
  const [matches, setMatches] = useState<Record<Tab, Match[] | null>>({ help: null, rescue: null })
  const [loadingTab, setLoadingTab] = useState(false)
  const [responded, setResponded] = useState<Set<string>>(new Set())
  // 手段選択モーダル：タップしたマッチ相手（通話/会って話すを選んでからチャットへ）
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  // Rescue：承認/辞退のローカル状態（userId→状態）。ボタンはカード上に直接置く。
  const [rescueStatus, setRescueStatus] = useState<Record<string, RescueStatus>>({})
  // 初回訪問時の案内（①左上アイコンのプロフィール案内 → ②3ページ説明モーダル）
  const [showIntro, setShowIntro] = useState(false)
  const [showPeek, setShowPeek] = useState(false)
  // Come on：希望時間の選択モーダル（30分/1時間/1時間30分）
  const [comeOnOpen, setComeOnOpen] = useState(false)
  const [comeOnMinutes, setComeOnMinutes] = useState(30)

  // モードに応じて初期タブを合わせる
  useEffect(() => {
    const m = localStorage.getItem('selectedMode') === 'host' ? 'host' : 'user'
    setMode(m)
    setActiveTab(m === 'host' ? 'rescue' : 'help')
    let t: ReturnType<typeof setTimeout> | undefined
    if (!localStorage.getItem('home_intro_seen_v1')) {
      t = setTimeout(() => setShowPeek(true), 750)
    }
    return () => { if (t) clearTimeout(t) }
  }, [])

  useEffect(() => {
    document.body.style.overscrollBehavior = 'none'
    return () => { document.body.style.overscrollBehavior = '' }
  }, [])

  useEffect(() => {
    const uid = localStorage.getItem('user_id')
    if (!uid) return
    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('users') as any)
        .select('id, username, avatar_url')
        .eq('id', uid)
        .single()
      setMe((data as Me) ?? null)
    })()
  }, [])

  // タブに応じたマッチ一覧を取得（タブごとにキャッシュ）
  const loadMatches = useCallback(async (tab: Tab) => {
    const uid = localStorage.getItem('user_id')
    if (!uid) return
    setLoadingTab(true)
    try {
      const res = await fetch(`${EDGE_FUNCTIONS_BASE}/match-users`, {
        method: 'POST',
        headers: EDGE_FUNCTION_HEADERS,
        body: JSON.stringify({ user_id: uid, mode: tab }),
      })
      const data = await res.json().catch(() => ({}))
      let users = (data?.users as Match[]) ?? []
      // Rescue：実マッチが0件のときはモックをフォールバック表示（USE_MOCK_RESCUE）
      if (tab === 'rescue' && USE_MOCK_RESCUE && users.length === 0) users = RESCUE_MOCKS
      setMatches(prev => ({ ...prev, [tab]: users }))
    } catch {
      // 通信失敗時も Rescue はモックにフォールバック（それ以外は空）
      setMatches(prev => ({ ...prev, [tab]: tab === 'rescue' && USE_MOCK_RESCUE ? RESCUE_MOCKS : [] }))
    } finally {
      setLoadingTab(false)
    }
  }, [])

  useEffect(() => {
    if (matches[activeTab] === null) void loadMatches(activeTab)
  }, [activeTab, matches, loadMatches])

  // 手段選択モーダルで手段を選んだ → accepted な connection を用意してチャットへ遷移
  const openChat = async (m: Match, want: WantKey) => {
    const uid = localStorage.getItem('user_id')
    if (!uid) return

    // 表示確認用モック（mock-*）は実在ユーザーではないため、connections /
    // friend_messages への保存が外部キー制約で失敗する。誤検証を防ぐため弾く。
    if (m.userId.startsWith('mock-')) {
      setSelectedMatch(null)
      alert('これは表示確認用のデモユーザーです。実在するユーザーが表示されているときにお試しください。')
      return
    }

    setResponded(prev => new Set(prev).add(m.userId))
    setSelectedMatch(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from('connections') as any)
      .select('id')
      .or(`and(requester_id.eq.${uid},receiver_id.eq.${m.userId}),and(requester_id.eq.${m.userId},receiver_id.eq.${uid})`)
    if (!existing || existing.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('connections') as any)
        .insert({ requester_id: uid, receiver_id: m.userId, status: 'accepted' })
    }

    const q = new URLSearchParams({
      friendId: m.userId,
      name: m.username,
      tag: m.tag,
      want,
      preset: PRESET_MESSAGES[want],
    }).toString()
    router.push(`/room/friend/chat?${q}`)
  }

  // ── Rescue：承認 ──────────────────────────────────────────────────────
  // 1) connections を accepted で用意（モックはローカルstateのみ）
  // 2) friend_messages に自動メッセージ（natsuki→相手, type:'chat'）を insert
  // 3) カードを「承認済み ✓ ＋ チャットを開く」に切り替え（rescueStatus）
  const approveRescue = async (m: Match) => {
    const uid = localStorage.getItem('user_id')
    if (!uid) return
    setRescueStatus(prev => ({ ...prev, [m.userId]: 'accepted' }))

    const firstTag = m.tags && m.tags.length > 0 ? m.tags[0] : m.tag
    // HELP側の1通目（希望手段で文面が変わる）。want 未設定の実データは 'chat' 相当にフォールバック。
    const opening = HELP_OPENING[m.want ?? 'chat']

    // Come on（対面）：承認と同時に自分（Rescue側）のGPSを取得する。
    // 会話の2件（相手の依頼＋こちらの承諾）はチャット画面（?type=comeon）側で
    // comeon-help-001 / comeon-rescue-001 として確定シードするため、ここでは差し込まない。
    if (m.isComeOn) {
      ensureThread({ friendId: m.userId, name: m.username, tag: firstTag, replies: RESCUE_MOCK_REPLIES })
      // モック確認用に固定座標。実機では navigator.geolocation.getCurrentPosition を使う。
      console.log('[Come on] Rescue GPS取得', COMEON_RESCUE_GPS)
      return
    }

    // モック（mock-*）：localStorage にスレッドを生成し、2件を時系列順で確定シードする。
    //   1件目＝HELP側（相手）のあいさつ   2件目＝Rescue側（natsuki）の承諾
    // seedMessages は固定IDで冪等なので、再承認・再訪しても二重に入らない。
    if (USE_MOCK_RESCUE && m.userId.startsWith('mock-')) {
      ensureThread({ friendId: m.userId, name: m.username, tag: firstTag, replies: RESCUE_MOCK_REPLIES })
      const base = Date.now()
      seedMessages(m.userId, [
        { id: 'rescue-help-001', sender_id: m.userId, receiver_id: uid, content: opening, created_at: new Date(base - 2000).toISOString() },
        { id: 'rescue-approve-001', sender_id: uid, receiver_id: m.userId, content: RESCUE_APPROVE_MESSAGE, created_at: new Date(base - 1000).toISOString() },
      ])
      return
    }

    // 実データ：connections を accepted で作成（既存があればスキップ）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from('connections') as any)
      .select('id')
      .or(`and(requester_id.eq.${uid},receiver_id.eq.${m.userId}),and(requester_id.eq.${m.userId},receiver_id.eq.${uid})`)
    if (!existing || existing.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('connections') as any)
        .insert({ requester_id: uid, receiver_id: m.userId, status: 'accepted' })
    }
    // Rescue側（natsuki→相手）のあいさつを insert（type:'text'）。
    // HELP側の1通目は、相手が /help から送信済み（friend_messages に既在）なので、
    // チャット画面では「HELP側→Rescue側」の順で2件が表示される。
    // ※ type:'chat' は friend_messages の CHECK 制約に無く INSERT が失敗するため 'text' を使う。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('friend_messages') as any)
      .insert({ sender_id: uid, receiver_id: m.userId, content: RESCUE_APPROVE_MESSAGE, type: 'text' })
  }

  // ── Rescue：辞退（カードをグレーアウト表示に）──
  const declineRescue = (m: Match) => {
    setRescueStatus(prev => ({ ...prev, [m.userId]: 'declined' }))
  }

  // ── Rescue：承認済みカードの「チャットを開く」──
  // モックは localStorage のスレッド、実データは friend_messages を、同じチャット画面が表示する。
  const openRescueChat = (m: Match) => {
    const firstTag = m.tags && m.tags.length > 0 ? m.tags[0] : m.tag
    // Come on（対面）は地図付きチャット（?type=comeon）へ。距離・希望時間・相手の座標も渡す。
    if (m.isComeOn) {
      const q = new URLSearchParams({
        friendId: m.userId, name: m.username, tag: firstTag,
        want: 'meet', type: 'comeon',
        minutes: String(m.preferredTime ?? 30),
        dist: `${m.distance ?? 1.2}km`,
        lat: String(m.lat ?? ''), lng: String(m.lng ?? ''),
      }).toString()
      router.push(`/home/chat?${q}`)
      return
    }
    const q = new URLSearchParams({ friendId: m.userId, name: m.username, tag: firstTag }).toString()
    router.push(`/home/chat?${q}`)
  }

  // ── Come on：希望時間を選んで、あおいとの地図付きチャット（?type=comeon）へ直行 ──
  // Lottery（GPS一覧）は廃止。地図はチャット内の ComeOnMap で表示する。
  const startComeOn = (minutes: number) => {
    const t = COMEON_TARGET
    ensureThread({ friendId: t.userId, name: t.username, tag: t.tag })
    const q = new URLSearchParams({
      friendId: t.userId,
      name: t.username,
      tag: t.tag,
      want: 'meet',
      type: 'comeon',
      minutes: String(minutes),
      dist: t.dist,
    }).toString()
    setComeOnOpen(false)
    router.push(`/home/chat?${q}`)
  }

  const list = matches[activeTab]

  // いま選んでいるモードに対応するタブ（help=user / rescue=host）。
  // これ以外のタブを開いている間は一覧を出さず、モード切替を促す。
  const currentModeTab: Tab = mode === 'host' ? 'rescue' : 'help'
  const isViewingOtherMode = activeTab !== currentModeTab

  // 「切り替える」ボタン：モード選択画面（/mode）へ遷移する。
  const switchToViewedMode = () => {
    router.push('/mode')
  }

  return (
    <>
    <div
      className="md:max-w-3xl! md:h-[calc(100svh-56px)]! md:-translate-x-[120px]"
      style={{
        background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
        height: 'calc(100svh - env(safe-area-inset-top))', overflow: 'hidden', position: 'relative',
        display: 'flex', flexDirection: 'column',
      }}>

      {/* ── ヘッダー（左：アバター／中央：ロゴ／右：ヘルプ） ── */}
      <div className="flex items-center justify-between md:hidden" style={{ padding: '12px 16px 10px', flexShrink: 0 }}>
        <UserAvatar
          username={me?.username}
          avatarUrl={me?.avatar_url}
          size={32}
          onClick={() => setIsDrawerOpen(true)}
        />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <AppLogo size="sm" />
        </div>
        <button
          onClick={() => setShowIntro(true)}
          aria-label="使い方"
          style={{
            width: 32, height: 32, flexShrink: 0, borderRadius: '50%', cursor: 'pointer',
            border: '1px solid #D4B896', background: '#FFFFFF', color: '#8B6914',
            fontSize: 15, fontWeight: 700,
          }}
        >
          ?
        </button>
      </div>

      {/* ── 上部タブ（HELP／Rescue） ── */}
      <div style={{
        display: 'flex', background: '#EDE5D0', borderRadius: 12, padding: 3,
        margin: '4px 20px 0', flexShrink: 0,
      }}>
        {(['help', 'rescue'] as Tab[]).map(t => (
          <button
            key={t}
            // タブは「見るだけ」の切替。実際のモード変更は本体の切替ボタンで行う。
            onClick={() => setActiveTab(t)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: activeTab === t ? '#FFFFFF' : 'transparent',
              color: activeTab === t ? '#3B2F1E' : 'rgba(59,47,30,0.45)',
              fontSize: 13, fontWeight: activeTab === t ? 700 : 500,
              boxShadow: activeTab === t ? '0 1px 3px rgba(59,47,30,0.1)' : 'none',
            }}
          >
            {TAB_META[t].label}
          </button>
        ))}
      </div>

      {/* ── 本体：マッチ一覧 ── */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'none',
        WebkitOverflowScrolling: 'touch', padding: '20px 20px calc(100px + env(safe-area-inset-bottom))',
      }}>
        {isViewingOtherMode ? (
          /* いまのモードではないタブを見ているとき：一覧は出さず、
             「今はこのモードではない」旨とモード切替ボタンを表示する。 */
          <div
            className="md:max-w-md md:w-full md:mx-auto"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', textAlign: 'center', gap: 16,
              minHeight: 'calc(100svh - 240px)', padding: '0 8px',
            }}
          >
            <span style={{ fontSize: 40 }}>{activeTab === 'rescue' ? '🤝' : '🙏'}</span>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E', margin: 0, lineHeight: 1.6 }}>
              今は「{TAB_META[activeTab].label}」モードではありません
            </p>
            <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.55)', margin: 0, lineHeight: 1.7 }}>
              「{TAB_META[activeTab].label}」の相手を見るには<br />このモードに切り替えてください。
            </p>
            <button
              onClick={switchToViewedMode}
              style={{
                marginTop: 8, padding: '15px 32px', borderRadius: 28, border: 'none', cursor: 'pointer',
                background: '#4A7C59', color: '#F5F0E8', fontSize: 15, fontWeight: 700,
                boxShadow: '0 4px 14px rgba(74,124,89,0.35)',
              }}
            >
              「{TAB_META[activeTab].label}」モードに切り替える
            </button>
          </div>
        ) : (
        <>
        {/* ── Talk to me（通話）／Come on（対面）ボタン（HELPタブのみ） ── */}
        {/* 画面を開いたとき2ボタンが縦幅の大部分を占めて「ドーン」と目に入る。
            一致相手の一覧（空メッセージ含む）はこの下にスクロールで続く。 */}
        {activeTab === 'help' && (
          <div
            className="md:max-w-md md:w-full md:mx-auto"
            style={{
              display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24,
              minHeight: 'calc(100svh - 210px)',
            }}
          >
            <button
              onClick={() => router.push('/help')}
              style={{
                width: '100%', flex: 1, minHeight: 220,
                border: 'none', borderRadius: 24, cursor: 'pointer',
                background: 'linear-gradient(135deg, #F6D06B 0%, #E0A020 100%)',
                boxShadow: '0 6px 18px rgba(224,160,32,0.35)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12,
              }}
            >
              <span style={{ fontSize: 36, fontWeight: 800, color: '#FFFFFF', letterSpacing: 1 }}>Talk me</span>
              <span style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>
                話したい・聞いてほしい
              </span>
            </button>
            {/* 対面（Come on）→ 希望時間を選んで、地図付きチャットへ直行 */}
            <button
              onClick={() => { setComeOnMinutes(30); setComeOnOpen(true) }}
              style={{
                width: '100%', flex: 1, minHeight: 220,
                border: 'none', borderRadius: 24, cursor: 'pointer',
                background: 'linear-gradient(135deg, #E8654F 0%, #C0392B 100%)',
                boxShadow: '0 6px 18px rgba(192,57,43,0.35)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12,
              }}
            >
              <span style={{ fontSize: 36, fontWeight: 800, color: '#FFFFFF', letterSpacing: 1 }}>Come on</span>
              <span style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>
                近くで直接会いたい
              </span>
            </button>
          </div>
        )}

        {list === null || loadingTab ? (
          <p style={{ textAlign: 'center', paddingTop: 48, fontSize: 13, color: 'rgba(59,47,30,0.45)' }}>
            探しています...
          </p>
        ) : list.length === 0 ? (
          // 一致相手がいないときは何も表示しない（アイコン・説明文は出さない）
          null
        ) : (
          <>
            <p style={{ fontSize: 14, color: '#3B2F1E', margin: '0 0 16px', textAlign: 'center' }}>
              一致する相手が <span style={{ fontWeight: 700, color: '#4A7C59' }}>{list.length}人</span> います
            </p>
            <div className={activeTab === 'rescue'
              ? 'flex flex-col gap-4 md:max-w-xl md:mx-auto'
              : 'flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:grid-cols-3 md:items-start'}>
              {list.map(item => {
                // アバター＋名前＋タグ（カード共通パーツ）
                const identity = (grayed: boolean) => (
                  <>
                    <div style={{ filter: grayed ? 'grayscale(1)' : 'none' }}>
                      <UserAvatar username={item.username} avatarUrl={item.avatar_url} size={44} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#3B2F1E', marginBottom: 4 }}>
                        {item.username}
                      </span>
                      <span style={{
                        display: 'inline-block',
                        background: grayed ? 'rgba(139,115,85,0.2)' : '#E4EFE0',
                        color: grayed ? 'rgba(59,47,30,0.5)' : '#3B6D11',
                        borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 600,
                      }}>
                        #{item.tag}
                      </span>
                    </div>
                  </>
                )

                // ── Rescue タブ：情報量の多い大きめカード（縦1列）＋承認/辞退フロー ──
                if (activeTab === 'rescue') {
                  const st = rescueStatus[item.userId]
                  const grayed = st === 'declined'
                  // shadowタグ（複数）。モック未設定の実データは先頭タグ1件にフォールバック。
                  const shadowTags = item.tags && item.tags.length > 0 ? item.tags : [item.tag]
                  const wantMeta = item.want ? WANT_META[item.want] : null

                  return (
                    <div
                      key={item.userId}
                      style={{
                        width: '100%',
                        background: grayed ? '#ECE7DE' : '#FFFFFF',
                        borderRadius: 18, border: '1px solid rgba(139,115,85,0.15)',
                        boxShadow: grayed ? 'none' : '0 2px 12px rgba(59,47,30,0.07)',
                        padding: 18, opacity: grayed ? 0.7 : 1,
                        display: 'flex', flexDirection: 'column', gap: 14,
                      }}
                    >
                      {/* 上段：アバター＋名前＋希望手段（＋承認済みバッジ） */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ filter: grayed ? 'grayscale(1)' : 'none' }}>
                          <UserAvatar username={item.username} avatarUrl={item.avatar_url} size={52} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: '#3B2F1E', marginBottom: 5 }}>
                            {item.username}
                          </span>
                          {wantMeta && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: grayed ? 'rgba(139,115,85,0.15)' : '#F3ECDD',
                              color: grayed ? 'rgba(59,47,30,0.5)' : '#8B6914',
                              borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700,
                            }}>
                              {wantMeta.icon} {wantMeta.label}を希望
                            </span>
                          )}
                        </div>
                        {st === 'accepted' && (
                          <span style={{ fontSize: 12, color: '#3B6D11', fontWeight: 700, flexShrink: 0 }}>
                            承認済み ✓
                          </span>
                        )}
                      </div>

                      {/* Come on（対面）：距離・希望時間（Talk me カードと区別する情報） */}
                      {item.isComeOn && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
                          background: grayed ? 'rgba(139,115,85,0.12)' : '#FBE4DE',
                          color: grayed ? 'rgba(59,47,30,0.5)' : '#C0392B',
                          borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 700,
                        }}>
                          📍 {item.distance ?? 1.2}km先 · {item.preferredTime ?? 30}分希望
                        </div>
                      )}

                      {/* shadowタグ（ハッシュタグ形式・複数） */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {shadowTags.map(t => (
                          <span key={t} style={{
                            display: 'inline-block',
                            background: grayed ? 'rgba(139,115,85,0.15)' : '#E4EFE0',
                            color: grayed ? 'rgba(59,47,30,0.5)' : '#3B6D11',
                            borderRadius: 20, padding: '4px 11px', fontSize: 12, fontWeight: 600,
                          }}>
                            #{t}
                          </span>
                        ))}
                      </div>

                      {/* アクション：未承認=承認/辞退（横並び）／承認済み=チャットを開く／辞退=辞退しました */}
                      {st === 'declined' ? (
                        <span style={{ fontSize: 13, color: 'rgba(59,47,30,0.5)', fontWeight: 700, textAlign: 'center' }}>
                          辞退しました
                        </span>
                      ) : st === 'accepted' ? (
                        <button
                          onClick={() => openRescueChat(item)}
                          style={{
                            width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #F6D06B 0%, #E0A020 100%)',
                            color: '#FFFFFF', fontSize: 15, fontWeight: 700,
                          }}
                        >
                          チャットを開く
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            onClick={() => approveRescue(item)}
                            style={{
                              flex: 1, padding: '13px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                              background: 'linear-gradient(135deg, #F6D06B 0%, #E0A020 100%)',
                              color: '#FFFFFF', fontSize: 15, fontWeight: 700,
                            }}
                          >
                            承認する
                          </button>
                          <button
                            onClick={() => declineRescue(item)}
                            style={{
                              flex: 1, padding: '13px 0', borderRadius: 14, cursor: 'pointer',
                              background: '#EFEBE3', border: '1px solid #C9C2B4',
                              color: '#6B6355', fontSize: 15, fontWeight: 700,
                            }}
                          >
                            辞退する
                          </button>
                        </div>
                      )}
                    </div>
                  )
                }

                // ── HELP タブ：従来どおり（手段選択モーダル）──
                const done = responded.has(item.userId)
                return (
                  <button
                    key={item.userId}
                    onClick={() => !done && setSelectedMatch(item)}
                    disabled={done}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                      background: done ? '#ECE7DE' : '#FFFFFF', borderRadius: 14,
                      border: '1px solid rgba(139,115,85,0.15)',
                      boxShadow: done ? 'none' : '0 1px 4px rgba(59,47,30,0.05)',
                      padding: '12px 14px', textAlign: 'left',
                      cursor: done ? 'default' : 'pointer', opacity: done ? 0.65 : 1,
                    }}
                  >
                    {identity(done)}
                    <span style={{ fontSize: 13, color: done ? 'rgba(59,47,30,0.4)' : '#4A7C59', fontWeight: 700, flexShrink: 0 }}>
                      {done ? '応答済み' : '話す ›'}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
        </>
        )}
      </div>
    </div>

      {/* 以下 fixed オーバーレイ類は transform 対象の外に出す */}
      <BottomNav />

      {/* ── 手段選択モーダル（通話／会って話すを選んでからチャットへ） ── */}
      {selectedMatch && (
        <RequestModal
          name={selectedMatch.username}
          tag={selectedMatch.tag}
          onClose={() => setSelectedMatch(null)}
          onSent={() => {}}
          onTalkNow={(method) => openChat(selectedMatch, method as WantKey)}
        />
      )}

      {/* ── Come on：希望時間の選択モーダル（30分 / 1時間 / 1時間30分） ── */}
      {comeOnOpen && (
        <div
          onClick={() => setComeOnOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(59,47,30,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 320, background: '#F5F0E8', borderRadius: 20, padding: '24px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}
          >
            <span style={{ fontSize: 34 }}>🤝</span>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E', margin: 0, textAlign: 'center' }}>
              近くの人に会いに行きますか？
            </p>
            <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.6)', margin: 0, textAlign: 'center', lineHeight: 1.7 }}>
              どのくらいの時間、<br />会って話したいか選んでください。
            </p>

            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              {COMEON_DURATIONS.map(o => {
                const on = comeOnMinutes === o.minutes
                return (
                  <button
                    key={o.minutes}
                    onClick={() => setComeOnMinutes(o.minutes)}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 14, cursor: 'pointer',
                      background: on ? '#FBE4DE' : '#FFFFFF',
                      border: on ? '2px solid #C0392B' : '1px solid rgba(139,115,85,0.3)',
                      color: on ? '#C0392B' : '#5C3A1E', fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => startComeOn(comeOnMinutes)}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 24, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #E8654F 0%, #C0392B 100%)',
                color: '#FFFFFF', fontSize: 15, fontWeight: 700, marginTop: 4,
              }}
            >
              この時間で会いに行く
            </button>
            <button
              onClick={() => setComeOnOpen(false)}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 24,
                border: '1px solid rgba(139,115,85,0.4)', background: 'transparent',
                color: '#5C3A1E', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* ── プロフィールドロワー ── */}
      <ProfileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* ── 初回訪問時の案内 ①：左上アイコンからプロフィールが見られる ── */}
      {showPeek && (
        <ProfilePeekModal
          onClose={() => { setShowPeek(false); setShowIntro(true) }}
        />
      )}

      {/* ── 初回訪問時の案内 ②：説明モーダル（ヘルプボタンからも再表示可） ── */}
      {showIntro && (
        <HomeIntroModal
          onDone={() => { setShowIntro(false); localStorage.setItem('home_intro_seen_v1', 'true') }}
        />
      )}
    </>
  )
}
