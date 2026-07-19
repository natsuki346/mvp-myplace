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
type Match = { userId: string; username: string; avatar_url: string | null; tag: string }
type Tab = 'help' | 'rescue'

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
  const [activeTab, setActiveTab] = useState<Tab>('help')
  const [matches, setMatches] = useState<Record<Tab, Match[] | null>>({ help: null, rescue: null })
  const [loadingTab, setLoadingTab] = useState(false)
  const [responded, setResponded] = useState<Set<string>>(new Set())
  // 手段選択モーダル：タップしたマッチ相手（通話/会って話すを選んでからチャットへ）
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  // 初回訪問時の案内（①左上アイコンのプロフィール案内 → ②3ページ説明モーダル）
  const [showIntro, setShowIntro] = useState(false)
  const [showPeek, setShowPeek] = useState(false)

  // モードに応じて初期タブを合わせる
  useEffect(() => {
    const m = localStorage.getItem('selectedMode') === 'host' ? 'host' : 'user'
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
      setMatches(prev => ({ ...prev, [tab]: (data?.users as Match[]) ?? [] }))
    } catch {
      setMatches(prev => ({ ...prev, [tab]: [] }))
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

  const list = matches[activeTab]
  const meta = TAB_META[activeTab]

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
              <span style={{ fontSize: 36, fontWeight: 800, color: '#FFFFFF', letterSpacing: 1 }}>Talk to me</span>
              <span style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>
                話したい・聞いてほしい
              </span>
            </button>
            {/* 対面マッチング（GPS・3km以内）→ /lottery の地図画面へ */}
            <button
              onClick={() => router.push('/lottery')}
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
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 14, padding: '48px 12px 0', textAlign: 'center',
          }}>
            <div style={{ fontSize: 44 }}>{meta.emptyIcon}</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#3B2F1E', margin: 0 }}>{meta.empty}</p>
            <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.6)', margin: 0, lineHeight: 1.7 }}>{meta.hint}</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 14, color: '#3B2F1E', margin: '0 0 16px', textAlign: 'center' }}>
              一致する相手が <span style={{ fontWeight: 700, color: '#4A7C59' }}>{list.length}人</span> います
            </p>
            <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:grid-cols-3 md:items-start">
              {list.map(item => {
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
                    <div style={{ filter: done ? 'grayscale(1)' : 'none' }}>
                      <UserAvatar username={item.username} avatarUrl={item.avatar_url} size={44} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#3B2F1E', marginBottom: 4 }}>
                        {item.username}
                      </span>
                      <span style={{
                        display: 'inline-block',
                        background: done ? 'rgba(139,115,85,0.2)' : '#E4EFE0',
                        color: done ? 'rgba(59,47,30,0.5)' : '#3B6D11',
                        borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 600,
                      }}>
                        #{item.tag}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, color: done ? 'rgba(59,47,30,0.4)' : '#4A7C59', fontWeight: 700, flexShrink: 0 }}>
                      {done ? '応答済み' : '話す ›'}
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
