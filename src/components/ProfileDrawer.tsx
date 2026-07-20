'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/src/lib/supabase/client'
import { clearSession } from '@/src/lib/session'
import { formatHashtag } from '@/app/onboarding/garden-setup/garden-visuals'
import { UserAvatar } from '@/src/components/UserAvatar'

type UserRow = { id: string; username: string; avatar_url: string | null }
type Tag = { id: string; text: string }
type ConnectionUser = { id: string; username: string; avatar_url: string | null }
type Connection = {
  id: string
  status: string
  requester_id: string
  receiver_id: string
  requester: ConnectionUser | null
  receiver: ConnectionUser | null
}

type Props = {
  isOpen?: boolean
  onClose?: () => void
  // PC（md以上）では、モーダルではなく左サイドバーとして inline 常時表示する。
  isInline?: boolean
}

// ── トップレベルのアコーディオンセクション（あなたの言葉／つながり／記録／設定） ──
// タイトルは text-base（16px）ではっきり見せ、下部に太めの divider を敷く。
function Section({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: () => void; children: ReactNode
}) {
  return (
    <div style={{ borderBottom: '1px solid #C9B48A', marginBottom: 4 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '16px 2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E' }}>{title}</span>
        <span style={{ fontSize: 14, color: '#8B6914' }}>{open ? '▲' : '▼'}</span>
      </button>
      <div style={{
        maxHeight: open ? 2000 : 0, opacity: open ? 1 : 0,
        overflow: 'hidden', transition: 'max-height 0.35s ease, opacity 0.3s ease',
      }}>
        <div style={{ padding: '2px 2px 16px' }}>{children}</div>
      </div>
    </div>
  )
}

// ── セクション内のサブアコーディオン（Daisy／Seed／つながり／通知設定） ──
function SubAccordion({ label, open, onToggle, children }: {
  label: ReactNode; open: boolean; onToggle: () => void; children: ReactNode
}) {
  return (
    <div style={{ border: '1px solid #D4B896', borderRadius: 12, padding: '0 14px', marginBottom: 10 }}>
      <div
        onClick={onToggle}
        style={{
          padding: '14px 0', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', cursor: 'pointer',
          borderBottom: open ? '1px solid #D4B896' : 'none',
        }}
      >
        <span style={{ fontSize: 14, color: '#8B6914', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, color: '#8B6914' }}>{open ? '▲' : '▼'}</span>
      </div>
      <div style={{
        maxHeight: open ? 600 : 0, opacity: open ? 1 : 0,
        overflow: 'hidden', transition: 'max-height 0.3s ease, opacity 0.3s ease',
      }}>
        <div style={{ padding: '12px 0' }}>{children}</div>
      </div>
    </div>
  )
}

export function ProfileDrawer({ isOpen = false, onClose = () => {}, isInline = false }: Props) {
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [user, setUser] = useState<UserRow | null>(null)
  const [lightTags, setLightTags] = useState<Tag[]>([])
  const [shadowTags, setShadowTags] = useState<Tag[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [pending, setPending] = useState<Connection[]>([])
  const [loading, setLoading] = useState(false)
  // トップレベルは一度に一つだけ開く（あなたの言葉 / つながり / 記録 / 設定）。
  const [open, setOpen] = useState<string | null>(null)
  const toggle = (id: string) => setOpen(o => (o === id ? null : id))
  // セクション内のサブアコーディオン。
  const [daisyOpen, setDaisyOpen] = useState(false)
  const [seedOpen, setSeedOpen] = useState(false)
  const [connectionsOpen, setConnectionsOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifMatch, setNotifMatch] = useState(false)
  const [notifMessage, setNotifMessage] = useState(false)

  const loadProfile = async (uid: string) => {
    setLoading(true)
    const [userRes, lightRes, shadowRes, connRes, pendingRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('users') as any)
        .select('id, username, avatar_url')
        .eq('id', uid)
        .single(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('tags') as any)
        .select('id, text')
        .eq('user_id', uid)
        .eq('type', 'light')
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('tags') as any)
        .select('id, text')
        .eq('user_id', uid)
        .eq('type', 'shadow')
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('connections') as any)
        .select('*, requester:users!requester_id(id, username, avatar_url), receiver:users!receiver_id(id, username, avatar_url)')
        .or(`requester_id.eq.${uid},receiver_id.eq.${uid}`)
        .eq('status', 'accepted'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('connections') as any)
        .select('*, requester:users!requester_id(id, username, avatar_url)')
        .eq('receiver_id', uid)
        .eq('status', 'pending'),
    ])
    setUser((userRes.data as UserRow) ?? null)
    setLightTags((lightRes.data as Tag[]) ?? [])
    setShadowTags((shadowRes.data as Tag[]) ?? [])
    setConnections((connRes.data as Connection[]) ?? [])
    setPending((pendingRes.data as Connection[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (!isInline && !isOpen) return
    const uid = localStorage.getItem('user_id')
    setUserId(uid)
    if (uid) loadProfile(uid)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isInline])

  const handleAccept = async (connId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('connections') as any).update({ status: 'accepted' }).eq('id', connId)
    if (userId) loadProfile(userId)
  }

  const handleReject = async (connId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('connections') as any).delete().eq('id', connId)
    if (userId) loadProfile(userId)
  }

  const goProfile = () => { onClose(); router.push('/profile') }

  const handleLogout = () => {
    // ログアウト時はオンライン状態を解除（失敗しても続行）
    const uid = localStorage.getItem('user_id')
    if (uid) {
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/set-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        },
        body: JSON.stringify({ user_id: uid, is_online: false }),
      }).catch(() => {})
    }
    clearSession()
    onClose()
    router.push('/username')
  }

  // 利用モードの切り替え → モード選択画面を再表示する
  const openModeSelect = () => {
    onClose()
    router.push('/mode')
  }

  // 閉じるボタン（PCサイドバー = inline 時は表示しない）
  const closeButton = (
    <div style={{
      display: 'flex', justifyContent: 'flex-end',
      // ドロワーは position:fixed top:0 のため body の safe-area padding が効かない。
      // ノッチ/ステータスバーに×が潜り込まないよう、ここで safe-area 分下げる。
      padding: 'calc(16px + env(safe-area-inset-top)) 16px 8px', flexShrink: 0,
    }}>
      <button
        onClick={onClose}
        aria-label="閉じる"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 22, color: 'rgba(59,47,30,0.4)', lineHeight: 1, padding: 4,
        }}
      >
        ✕
      </button>
    </div>
  )

  const body = loading ? (
    <p style={{ textAlign: 'center', color: '#A09070', fontSize: 13, paddingTop: 40 }}>
      読み込み中...
    </p>
  ) : (
    <div style={{ padding: isInline ? '16px 16px 40px' : '0 16px 40px' }}>

            {/* ── ① プロフィール情報（アバター＋ユーザー名。inline時は下部チップに集約するため非表示） ── */}
            {!isInline && (
              <button
                onClick={goProfile}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18,
                  width: '100%', background: 'transparent', border: 'none',
                  padding: 0, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <UserAvatar username={user?.username} avatarUrl={user?.avatar_url} size={64} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#3B2F1E', margin: 0 }}>
                    {user?.username ?? ''}
                  </p>
                  <p style={{ fontSize: 12, color: '#8B6914', margin: '3px 0 0' }}>
                    @{user?.username ?? ''}
                  </p>
                </div>
              </button>
            )}

            {/* ── ② プロフィールを見る（目立つ緑ボタン。あなたの言葉の直上） ── */}
            <button
              onClick={goProfile}
              style={{
                width: '100%', background: '#3B6D11', color: 'white',
                borderRadius: 8, padding: 10, border: 'none', cursor: 'pointer',
                fontSize: 15, fontWeight: 700, marginBottom: 18,
              }}
            >
              プロフィールを見る
            </button>

            {/* ── ③ あなたの言葉（Daisy / Seed） ── */}
            <Section title="あなたの言葉" open={open === 'words'} onToggle={() => toggle('words')}>
              {/* Daisy サブアコーディオン */}
              <SubAccordion
                label={`🌼 Daisy（${lightTags.length}）`}
                open={daisyOpen}
                onToggle={() => setDaisyOpen(o => !o)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {lightTags.length === 0
                    ? <p style={{ fontSize: 13, color: '#A09070', margin: 0 }}>まだありません</p>
                    : lightTags.map(tag => (
                      <span key={tag.id} style={{
                        background: '#F5D78E', borderRadius: 12, padding: '8px 12px',
                        fontSize: 13, color: '#8B6914',
                      }}>
                        {formatHashtag(tag.text)}
                      </span>
                    ))
                  }
                </div>
              </SubAccordion>

              {/* Seed サブアコーディオン */}
              <SubAccordion
                label={`🌱 Seed（${shadowTags.length}）`}
                open={seedOpen}
                onToggle={() => setSeedOpen(o => !o)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {shadowTags.length === 0
                    ? <p style={{ fontSize: 13, color: '#A09070', margin: 0 }}>まだありません</p>
                    : shadowTags.map(tag => (
                      <span key={tag.id} style={{
                        background: '#D4B896', borderRadius: 12, padding: '8px 12px',
                        fontSize: 13, color: '#5C3A1E',
                      }}>
                        {formatHashtag(tag.text)}
                      </span>
                    ))
                  }
                </div>
              </SubAccordion>

              {/* MyGarden（タップで全画面遷移） */}
              <Link href="/garden" onClick={onClose} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{
                  border: '1px solid #D4B896', borderRadius: 12, padding: '14px 14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E' }}>🌿 MyGarden</span>
                  <span style={{ fontSize: 12, color: '#8B6914' }}>全画面で見る ›</span>
                </div>
              </Link>
            </Section>

            {/* ── ④ つながり（つながり一覧） ── */}
            <Section title="つながり" open={open === 'connections'} onToggle={() => toggle('connections')}>
              {/* つながり一覧 */}
              <SubAccordion
                label={`つながり（${connections.length}）`}
                open={connectionsOpen}
                onToggle={() => setConnectionsOpen(o => !o)}
              >
                {connections.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#A09070', margin: 0 }}>まだつながりがありません</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {connections.map(conn => {
                      const other = conn.requester_id === userId ? conn.receiver : conn.requester
                      return (
                        <div
                          key={conn.id}
                          onClick={() => other && router.push(`/profile/view?userId=${other.id}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                        >
                          <UserAvatar username={other?.username} avatarUrl={other?.avatar_url} size={36} />
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#3B2F1E' }}>
                            {other?.username}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </SubAccordion>

              {/* つながり申請 */}
              {pending.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#8B6914', margin: '0 0 8px' }}>
                    つながり申請（{pending.length}）
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {pending.map(req => (
                      <div key={req.id} style={{
                        background: '#FFFFFF', borderRadius: 12, padding: 12,
                        border: '1px solid rgba(212,184,150,0.5)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <UserAvatar username={req.requester?.username} avatarUrl={req.requester?.avatar_url} size={32} />
                          <p style={{ margin: 0, fontSize: 13, color: '#3B2F1E' }}>
                            {req.requester?.username}さんから申請
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleAccept(req.id)}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 20, border: 'none',
                              background: '#4A7C59', color: '#F5F0E8',
                              fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            承認する
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 20,
                              border: '1px solid #8B6914', background: 'transparent', color: '#8B6914',
                              fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            断る
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* ── ⑤ 記録セクションは非表示（MVPでは記録機能を出さない） ── */}

            {/* ── ⑥ 設定（通知設定） ── */}
            <Section title="設定" open={open === 'settings'} onToggle={() => toggle('settings')}>
              {/* 通知設定 サブアコーディオン */}
              <SubAccordion
                label="🔔 通知設定"
                open={notifOpen}
                onToggle={() => setNotifOpen(o => !o)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'マッチ通知', value: notifMatch, setter: setNotifMatch },
                    { label: 'メッセージ通知', value: notifMessage, setter: setNotifMessage },
                  ].map(({ label, value, setter }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, color: '#3B2F1E' }}>{label}</span>
                      <button
                        role="switch"
                        aria-checked={value}
                        onClick={() => setter(v => !v)}
                        style={{
                          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                          background: value ? '#4A7C59' : 'rgba(59,47,30,0.15)',
                          position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
                        }}
                      >
                        <span style={{
                          position: 'absolute', top: 3,
                          left: value ? 23 : 3,
                          width: 18, height: 18, borderRadius: '50%',
                          background: '#FFFFFF',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          transition: 'left 0.2s ease',
                          display: 'block',
                        }} />
                      </button>
                    </div>
                  ))}
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(59,47,30,0.4)' }}>
                    ※ 通知機能は現在準備中です
                  </p>
                </div>
              </SubAccordion>
            </Section>

            {/* ── ⑦ モード切替・ログアウト（トグルではなく従来通り常時表示） ── */}
            <button
              onClick={openModeSelect}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 20, marginTop: 16, marginBottom: 12,
                border: '1px solid #C9A84C', background: '#FBEFC6', color: '#8B6914',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              🔄 モードを切り替える
            </button>
            <button
              onClick={handleLogout}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 20,
                border: '1px solid #8B6914', background: 'transparent', color: '#8B6914',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ログアウト
            </button>
          </div>
  )

  // PC（md以上）：モーダルではなく左サイドバーとして inline 常時表示。
  // ×閉じるボタン・オーバーレイ・スライドアニメーションは無し。スマホでは非表示。
  if (isInline) {
    return (
      <aside
        className="hidden md:flex flex-col w-[240px] shrink-0 sticky top-14 h-[calc(100svh-56px)] border-r border-[rgba(139,115,85,0.2)]"
        style={{ background: '#F5F0E8' }}
      >
        {/* 既存のサイドバー内容（スクロール領域） */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {body}
        </div>

        {/* 下部固定：アバター＋ユーザー名（クリックで自分のプロフィールへ） */}
        <button
          onClick={() => router.push('/profile')}
          className="flex items-center gap-3 w-full shrink-0 bg-transparent hover:bg-[rgba(139,115,85,0.08)] transition-colors cursor-pointer"
          style={{ padding: '12px 16px', border: 'none', borderTop: '1px solid rgba(139,115,85,0.2)', textAlign: 'left' }}
        >
          <UserAvatar username={user?.username} avatarUrl={user?.avatar_url} size={36} />
          <span
            className="min-w-0 truncate"
            style={{ fontSize: 14, fontWeight: 600, color: '#3B2F1E' }}
          >
            {user?.username ?? ''}
          </span>
        </button>
      </aside>
    )
  }

  return (
    <>
      {/* オーバーレイ */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.45)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* ドロワーパネル */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, zIndex: 201,
          width: '80%', maxWidth: 310, height: '100svh',
          background: '#F5F0E8',
          boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {closeButton}
        {body}
      </div>
    </>
  )
}
