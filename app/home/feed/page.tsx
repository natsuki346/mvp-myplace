'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { BottomNav } from '@/src/components/BottomNav'
import { UserAvatar } from '@/src/components/UserAvatar'
import { ProfileDrawer } from '@/src/components/ProfileDrawer'
import RequestModal from '@/src/components/RequestModal'
import AppLogo from '@/src/components/AppLogo'
import HomeIntroModal from '@/src/components/tutorial/HomeIntroModal'
import ProfilePeekModal from '@/src/components/tutorial/ProfilePeekModal'

type WantKey = 'call' | 'meet'
// userId: プライベートチャット（friend_messages）で使う実ユーザーID
type Seeker = { name: string; userId: string; type: 'HELP' | 'SOS'; tag: string; want: WantKey; distance: string }

// 手段に応じた初期メッセージ（チャット遷移時に入力欄へプリセット）
const PRESET_MESSAGES: Record<WantKey, string> = {
  call: 'こんにちは。通話で話しましょうか？',
  meet: 'こんにちは。どこで会いますか？',
}

// 希望する手段のアイコン・ラベル（手段は電話か直接会うの2つ）
const WANT_META: Record<WantKey, { icon: string; label: string }> = {
  call: { icon: '📞', label: '通話' },
  meet: { icon: '☕', label: '会って話す' },
}

// 一覧上部の手段フィルター
const WANT_FILTERS: { key: 'all' | WantKey; label: string }[] = [
  { key: 'all',  label: 'すべて' },
  { key: 'call', label: '通話' },
  { key: 'meet', label: '会って話す' },
]

type Me = { id: string; username: string; avatar_url: string | null }

// 仮の固定値（後で実装）
const HELP_ONLINE = 47   // いま話せる人（ホスト）の人数
const REQUEST_COUNT = 5  // ホストに届いているリクエスト件数

// Rescueタブ：助けを求めている人（仮データ・後で実装）
const RESCUE_SEEKERS: Seeker[] = [
  { name: 'あきら', userId: '35290bd1-acd1-4027-a1e2-4466c902f842', type: 'HELP', tag: '仕事の悩み',   want: 'call', distance: '500m' },
  { name: 'みなと', userId: '82f477f9-4fe5-42e8-9cdc-36c8a3f196ec', type: 'HELP', tag: '人間関係',     want: 'call', distance: '1.5km' },
  { name: 'そら',   userId: '2df9e17f-4237-4a09-aebb-6aed63093288', type: 'SOS',  tag: '孤独感',       want: 'call', distance: 'オンライン' },
  { name: 'かなえ', userId: 'b7ad1935-94f5-4840-852d-41bce466bece', type: 'HELP', tag: '子育ての不安', want: 'meet', distance: '900m' },
  { name: 'りく',   userId: '0faf142e-b05d-463e-8a84-8d5e1d922351', type: 'SOS',  tag: '将来が不安',   want: 'meet', distance: '2.3km' },
]

export default function HomePage() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  // モード（'user'=話を聞いてほしい / 'host'=話を聞いてあげたい）。未設定は user 扱い
  const [mode, setMode] = useState<'user' | 'host'>('user')
  // 上部タブ（HELP＝話を聞ける人／Rescue＝助けを求めている人）。モードに関係なく両方表示・切替可
  const [activeTab, setActiveTab] = useState<'help' | 'rescue'>('help')
  // Rescue：応答対象の求助者と、応答済み（グレーモード）の集合、手段フィルター
  const [selectedSeeker, setSelectedSeeker] = useState<Seeker | null>(null)
  const [responded, setResponded] = useState<Set<string>>(new Set())
  const [wantFilter, setWantFilter] = useState<'all' | WantKey>('all')
  // 初回訪問時の案内（①3ページ説明モーダル → ②左上アイコンのプロフィール案内）
  const [showIntro, setShowIntro] = useState(false)
  const [showPeek, setShowPeek] = useState(false)

  // モードを読み込む（user→HELP画面 / host→Rescue画面をそのまま表示）
  useEffect(() => {
    const readMode = () => {
      const m = localStorage.getItem('selectedMode') === 'host' ? 'host' : 'user'
      setMode(m)
      // 表示タブも自分のモードのタブに合わせる（user→HELP / host→Rescue）
      setActiveTab(m === 'host' ? 'rescue' : 'help')
    }
    readMode()
    // PCNavの「話を聞く側になる」等、このページ表示中のモード切替に追従する
    window.addEventListener('daime-mode-changed', readMode)
    // 初回訪問：ホーム画面が一瞬見えてから、左上アイコンの案内アニメを出す
    let t: ReturnType<typeof setTimeout> | undefined
    if (!localStorage.getItem('home_intro_seen_v1')) {
      t = setTimeout(() => setShowPeek(true), 750)
    }
    return () => {
      window.removeEventListener('daime-mode-changed', readMode)
      if (t) clearTimeout(t)
    }
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

  // 「応答する」→ accepted な connection を用意（チャット一覧に出すため）してチャットへ遷移
  const respondToSeeker = async (seeker: Seeker) => {
    const uid = localStorage.getItem('user_id')
    if (!uid) return
    setResponded(prev => new Set(prev).add(seeker.name))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from('connections') as any)
      .select('id')
      .or(`and(requester_id.eq.${uid},receiver_id.eq.${seeker.userId}),and(requester_id.eq.${seeker.userId},receiver_id.eq.${uid})`)
    if (!existing || existing.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('connections') as any)
        .insert({ requester_id: uid, receiver_id: seeker.userId, status: 'accepted' })
    }

    const q = new URLSearchParams({
      friendId: seeker.userId,
      name: seeker.name,
      tag: seeker.tag,
      want: seeker.want,
      preset: PRESET_MESSAGES[seeker.want],
    }).toString()
    router.push(`/room/friend/chat?${q}`)
  }

  // 表示中のタブがHELPか
  const isHelp = activeTab === 'help'
  // いま開いているタブが自分のモードのタブか（HELP↔user / Rescue↔host）。
  // 一致するタブだけ実データを見せ、もう一方は「今はこのモードではない」案内を出す。
  const isMyTab = (activeTab === 'help' && mode === 'user') || (activeTab === 'rescue' && mode === 'host')

  return (
    <>
    <div
      // PC時：コンテナを広げ、上部ナビ（56px）分だけ高さを縮める。translateで画面全体（サイドバー240px無視）の中央に。スマホは inline style のまま
      className="md:max-w-3xl! md:h-[calc(100svh-56px)]! md:-translate-x-[120px]"
      style={{
        background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
        height: '100svh', overflow: 'hidden', position: 'relative',
        display: 'flex', flexDirection: 'column',
      }}>

      {/* ── ヘッダー（左にアイコン・中央にロゴ）。PC時はPCNavに統合済みのため非表示 ── */}
      <div className="flex items-center justify-between md:hidden" style={{
        padding: 'calc(12px + env(safe-area-inset-top)) 16px 10px', flexShrink: 0,
      }}>
        <UserAvatar
          username={me?.username}
          avatarUrl={me?.avatar_url}
          size={32}
          onClick={() => setIsDrawerOpen(true)}
        />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <AppLogo size="sm" />
        </div>
        <div style={{ width: 32, flexShrink: 0 }} />
      </div>

      {/* ── 上部タブ（常にHELP／Rescueの両方を表示・切替可） ── */}
      <div style={{
        display: 'flex', background: '#EDE5D0', borderRadius: 12, padding: 3,
        margin: '4px 20px 0', flexShrink: 0,
      }}>
        {([
          { key: 'help' as const, label: 'HELP' },
          { key: 'rescue' as const, label: 'Rescue' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: activeTab === t.key ? '#FFFFFF' : 'transparent',
              color: activeTab === t.key ? '#3B2F1E' : 'rgba(59,47,30,0.45)',
              fontSize: 13, fontWeight: activeTab === t.key ? 700 : 500,
              boxShadow: activeTab === t.key ? '0 1px 3px rgba(59,47,30,0.1)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 本体（自分のモードのタブだけ実データ／もう一方はモード外案内） ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 100px', display: 'flex', flexDirection: 'column' }}>

        {/* カウント（自分のモードのタブのときだけ・HELP＝話せる人数 / Rescue＝届いたリクエスト件数） */}
        {isMyTab && (
          <p style={{ fontSize: 14, color: '#3B2F1E', margin: '0 0 20px', textAlign: 'center', flexShrink: 0 }}>
            {isHelp
              ? <>いま話せる人が <span style={{ fontWeight: 700, color: '#4A7C59' }}>{HELP_ONLINE}人</span> います</>
              : <><span style={{ fontWeight: 700, color: '#C0392B' }}>{REQUEST_COUNT}件</span> のリクエストが届いています</>}
          </p>
        )}

        {!isMyTab ? (
          /* モード外タブ：今はこのモードではないことを案内し、切り替えを促す */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 8px',
          }}>
            <div style={{ fontSize: 44 }}>{isHelp ? '🙋' : '🤝'}</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#3B2F1E', margin: 0, textAlign: 'center' }}>
              {isHelp ? '今は「聞く」モードです' : '今は「話す」モードです'}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.6)', margin: 0, textAlign: 'center', lineHeight: 1.7 }}>
              {isHelp
                ? <>HELP（話を聞ける人）は<br />「話を聞いてほしい」モードで表示されます。</>
                : <>Rescue（助けを求めている人）は<br />「話を聞いてあげたい」モードで表示されます。</>}
            </p>
            <button
              onClick={() => router.push('/mode')}
              style={{
                marginTop: 4, padding: '11px 22px', borderRadius: 22, cursor: 'pointer',
                border: 'none', background: '#C9A84C', color: '#FFFFFF',
                fontSize: 14, fontWeight: 700, boxShadow: '0 3px 10px rgba(201,168,76,0.35)',
              }}
            >
              モードを切り替える
            </button>
          </div>
        ) : isHelp ? (
          /* HELPタブ：2ボタンを画面いっぱいに（押すと全画面で一覧へ）。PC時は幅を抑えて中央寄せ */
          <div className="md:max-w-md md:w-full md:mx-auto" style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 16 }}>
            <button
              onClick={() => router.push('/help')}
              style={{
                flex: 1, width: '100%', minHeight: 140,
                border: 'none', borderRadius: 24, cursor: 'pointer',
                background: 'linear-gradient(135deg, #F6D06B 0%, #E0A020 100%)',
                boxShadow: '0 6px 18px rgba(224,160,32,0.35)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 36, fontWeight: 800, color: '#FFFFFF', letterSpacing: 1 }}>HELP</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>
                話したい・聞いてほしい
              </span>
            </button>
            <button
              onClick={() => router.push('/sos')}
              style={{
                flex: 1, width: '100%', minHeight: 140,
                border: 'none', borderRadius: 24, cursor: 'pointer',
                background: 'linear-gradient(135deg, #E8654F 0%, #C0392B 100%)',
                boxShadow: '0 6px 18px rgba(192,57,43,0.35)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 36, fontWeight: 800, color: '#FFFFFF', letterSpacing: 1 }}>SOS</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>
                今すぐ助けが必要
              </span>
            </button>
          </div>
        ) : (
          /* Rescueタブ：ボタンなし・助けを求めている人の一覧 */
          <>
            {/* 希望する手段フィルター */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
              {WANT_FILTERS.map(f => {
                const on = wantFilter === f.key
                return (
                  <button
                    key={f.key}
                    onClick={() => setWantFilter(f.key)}
                    style={{
                      flexShrink: 0, padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                      border: on ? '1.5px solid #C9A84C' : '1px solid rgba(139,115,85,0.2)',
                      background: on ? '#FBEFC6' : '#FFFFFF',
                      color: on ? '#8B6914' : 'rgba(59,47,30,0.5)',
                      fontSize: 12, fontWeight: on ? 700 : 500,
                    }}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>

            {/* スマホ：縦1列 ／ PC：カードをグリッド表示 */}
            <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:grid-cols-3 md:items-start">
              {RESCUE_SEEKERS.filter(s => wantFilter === 'all' || s.want === wantFilter).map(item => {
                const done = responded.has(item.name)
                const wm = WANT_META[item.want]
                const badge = item.type === 'HELP'
                  ? { bg: '#C9A84C', label: 'HELP' }
                  : { bg: '#B0645C', label: 'SOS' }
                return (
                  <button
                    key={item.name}
                    onClick={() => !done && setSelectedSeeker(item)}
                    disabled={done}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                      background: done ? '#ECE7DE' : '#FFFFFF', borderRadius: 14,
                      border: '1px solid rgba(139,115,85,0.15)',
                      boxShadow: done ? 'none' : '0 1px 4px rgba(59,47,30,0.05)',
                      padding: '12px 14px', textAlign: 'left',
                      cursor: done ? 'default' : 'pointer',
                      opacity: done ? 0.65 : 1,
                      transition: 'opacity 0.2s ease, background 0.2s ease',
                    }}
                  >
                    <div style={{ filter: done ? 'grayscale(1)' : 'none' }}>
                      <UserAvatar username={item.name} avatarUrl={null} size={44} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* 名前＋HELP/SOSバッジ */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E' }}>{item.name}</span>
                        <span style={{
                          background: done ? 'rgba(139,115,85,0.35)' : badge.bg,
                          color: '#FFFFFF', borderRadius: 6,
                          padding: '1px 7px', fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                        }}>
                          {badge.label}
                        </span>
                      </div>
                      {/* 悩みタグ */}
                      <span style={{
                        display: 'inline-block',
                        background: done ? 'rgba(139,115,85,0.2)' : '#F3D2CC',
                        color: done ? 'rgba(59,47,30,0.5)' : '#B23A2A',
                        borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 600,
                        marginBottom: 4,
                      }}>
                        #{item.tag}
                      </span>
                      {/* 希望する手段（アイコン） */}
                      <p style={{ fontSize: 12, color: done ? 'rgba(59,47,30,0.4)' : '#4A7C59', margin: 0 }}>
                        {done ? '応答済み' : <>希望：{wm.icon} {wm.label}</>}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(59,47,30,0.45)', flexShrink: 0, alignSelf: 'flex-start' }}>
                      {item.distance}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>

      {/* 以下 fixed オーバーレイ類は transform 対象の外に出す */}
      <BottomNav />

      {/* ── Rescue：応答リクエストモーダル（相手の希望を見て応える） ── */}
      {selectedSeeker && (
        <RequestModal
          name={selectedSeeker.name}
          tag={selectedSeeker.tag}
          wantedMethod={WANT_META[selectedSeeker.want].label}
          onClose={() => setSelectedSeeker(null)}
          onSent={() => {}}
          onRespond={() => respondToSeeker(selectedSeeker)}
        />
      )}

      {/* ── プロフィールドロワー ── */}
      <ProfileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* ── 初回訪問時の案内 ①：左上アイコンからプロフィールが見られる（アニメ吹き出し） ── */}
      {showPeek && (
        <ProfilePeekModal
          onClose={() => { setShowPeek(false); setShowIntro(true) }}
        />
      )}

      {/* ── 初回訪問時の案内 ②：モード紹介 → HELP/SOS → Rescue（3ページ・説明のみ） ── */}
      {showIntro && (
        <HomeIntroModal
          onDone={() => { setShowIntro(false); localStorage.setItem('home_intro_seen_v1', 'true') }}
        />
      )}
    </>
  )
}
