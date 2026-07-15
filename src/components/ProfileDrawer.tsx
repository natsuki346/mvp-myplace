'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/src/lib/supabase/client'
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

export function ProfileDrawer({ isOpen = false, onClose = () => {}, isInline = false }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [user, setUser] = useState<UserRow | null>(null)
  const [lightTags, setLightTags] = useState<Tag[]>([])
  const [shadowTags, setShadowTags] = useState<Tag[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [pending, setPending] = useState<Connection[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
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

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploading(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) { setUploading(false); return }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('users') as any).update({ avatar_url: urlData.publicUrl }).eq('id', userId)
    setUser(prev => (prev ? { ...prev, avatar_url: urlData.publicUrl } : prev))
    setUploading(false)
  }

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

  const handleLogout = () => {
    localStorage.removeItem('user_id')
    localStorage.removeItem('username')
    onClose()
    router.push('/welcome')
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
      padding: '16px 16px 8px', flexShrink: 0,
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

            {/* ── ① プロフィール情報（inline時は下部アバターチップに集約するため非表示） ── */}
            {!isInline && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <UserAvatar username={user?.username} avatarUrl={user?.avatar_url} size={64} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  aria-label="アイコンを変更"
                  style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 24, height: 24, borderRadius: '50%',
                    border: '1px solid #D4B896', background: '#FFFFFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, cursor: uploading ? 'default' : 'pointer',
                    opacity: uploading ? 0.5 : 1,
                  }}
                >
                  📷
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </div>
              <div>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#3B2F1E', margin: 0 }}>
                  {user?.username ?? ''}
                </p>
                <p style={{ fontSize: 12, color: '#8B6914', margin: '3px 0 0' }}>
                  @{user?.username ?? ''}
                </p>
              </div>
            </div>
            )}

            {/* ── ② タグ一覧 ── */}
            <p style={{ fontSize: 12, fontWeight: 700, color: '#8B6914', margin: '0 0 8px' }}>
              あなたの言葉
            </p>

            {/* Daisy アコーディオン */}
            <div style={{ border: '1px solid #D4B896', borderRadius: 12, padding: '0 12px', marginBottom: 10 }}>
              <div
                onClick={() => setDaisyOpen(o => !o)}
                style={{
                  padding: '10px 0', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', cursor: 'pointer',
                  borderBottom: daisyOpen ? '1px solid #D4B896' : 'none',
                }}
              >
                <span style={{ fontSize: 12, color: '#8B6914', fontWeight: 600 }}>
                  🌼 Daisy（{lightTags.length}）
                </span>
                <span style={{ fontSize: 11, color: '#8B6914' }}>{daisyOpen ? '∧' : '∨'}</span>
              </div>
              <div style={{
                maxHeight: daisyOpen ? 400 : 0, opacity: daisyOpen ? 1 : 0,
                overflow: 'hidden', transition: 'max-height 0.3s ease, opacity 0.3s ease',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 0' }}>
                  {lightTags.length === 0
                    ? <p style={{ fontSize: 12, color: '#A09070', margin: 0 }}>まだありません</p>
                    : lightTags.map(tag => (
                      <span key={tag.id} style={{
                        background: '#F5D78E', borderRadius: 12, padding: '6px 10px',
                        fontSize: 12, color: '#8B6914',
                      }}>
                        {formatHashtag(tag.text)}
                      </span>
                    ))
                  }
                </div>
              </div>
            </div>

            {/* Seed アコーディオン */}
            <div style={{ border: '1px solid #D4B896', borderRadius: 12, padding: '0 12px', marginBottom: 20 }}>
              <div
                onClick={() => setSeedOpen(o => !o)}
                style={{
                  padding: '10px 0', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', cursor: 'pointer',
                  borderBottom: seedOpen ? '1px solid #D4B896' : 'none',
                }}
              >
                <span style={{ fontSize: 12, color: '#8B6914', fontWeight: 600 }}>
                  🌱 Seed（{shadowTags.length}）
                </span>
                <span style={{ fontSize: 11, color: '#8B6914' }}>{seedOpen ? '∧' : '∨'}</span>
              </div>
              <div style={{
                maxHeight: seedOpen ? 400 : 0, opacity: seedOpen ? 1 : 0,
                overflow: 'hidden', transition: 'max-height 0.3s ease, opacity 0.3s ease',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 0' }}>
                  {shadowTags.length === 0
                    ? <p style={{ fontSize: 12, color: '#A09070', margin: 0 }}>まだありません</p>
                    : shadowTags.map(tag => (
                      <span key={tag.id} style={{
                        background: '#D4B896', borderRadius: 12, padding: '6px 10px',
                        fontSize: 12, color: '#5C3A1E',
                      }}>
                        {formatHashtag(tag.text)}
                      </span>
                    ))
                  }
                </div>
              </div>
            </div>

            {/* ── ③ つながり ── */}
            <p style={{ fontSize: 12, fontWeight: 700, color: '#8B6914', margin: '0 0 8px' }}>
              つながり
            </p>
            <div style={{ border: '1px solid #D4B896', borderRadius: 12, padding: '0 12px', marginBottom: 10 }}>
              <div
                onClick={() => setConnectionsOpen(o => !o)}
                style={{
                  padding: '10px 0', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', cursor: 'pointer',
                  borderBottom: connectionsOpen ? '1px solid #D4B896' : 'none',
                }}
              >
                <span style={{ fontSize: 12, color: '#8B6914', fontWeight: 600 }}>
                  つながり（{connections.length}）
                </span>
                <span style={{ fontSize: 11, color: '#8B6914' }}>{connectionsOpen ? '∧' : '∨'}</span>
              </div>
              <div style={{
                maxHeight: connectionsOpen ? 600 : 0, opacity: connectionsOpen ? 1 : 0,
                overflow: 'hidden', transition: 'max-height 0.3s ease, opacity 0.3s ease',
              }}>
                <div style={{ padding: '10px 0' }}>
                  {connections.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#A09070', margin: 0 }}>まだつながりがありません</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {connections.map(conn => {
                        const other = conn.requester_id === userId ? conn.receiver : conn.requester
                        return (
                          <div
                            key={conn.id}
                            onClick={() => other && router.push(`/profile/view?userId=${other.id}`)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                          >
                            <UserAvatar username={other?.username} avatarUrl={other?.avatar_url} size={36} />
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#3B2F1E' }}>
                              {other?.username}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* つながり申請 */}
            {pending.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#8B6914', margin: '0 0 8px' }}>
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
                        <p style={{ margin: 0, fontSize: 12, color: '#3B2F1E' }}>
                          {req.requester?.username}さんから申請
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleAccept(req.id)}
                          style={{
                            flex: 1, padding: '6px 0', borderRadius: 20, border: 'none',
                            background: '#4A7C59', color: '#F5F0E8',
                            fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          承認する
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          style={{
                            flex: 1, padding: '6px 0', borderRadius: 20,
                            border: '1px solid #8B6914', background: 'transparent', color: '#8B6914',
                            fontSize: 12, fontWeight: 700, cursor: 'pointer',
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

            {/* ── ④ 通知設定 ── */}
            <div style={{ border: '1px solid #D4B896', borderRadius: 12, padding: '0 12px', marginBottom: 20, marginTop: 10 }}>
              <div
                onClick={() => setNotifOpen(o => !o)}
                style={{
                  padding: '10px 0', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', cursor: 'pointer',
                  borderBottom: notifOpen ? '1px solid #D4B896' : 'none',
                }}
              >
                <span style={{ fontSize: 12, color: '#8B6914', fontWeight: 600 }}>🔔 通知設定</span>
                <span style={{ fontSize: 11, color: '#8B6914' }}>{notifOpen ? '∧' : '∨'}</span>
              </div>
              <div style={{
                maxHeight: notifOpen ? 200 : 0, opacity: notifOpen ? 1 : 0,
                overflow: 'hidden', transition: 'max-height 0.3s ease, opacity 0.3s ease',
              }}>
                <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'マッチ通知', value: notifMatch, setter: setNotifMatch },
                    { label: 'メッセージ通知', value: notifMessage, setter: setNotifMessage },
                  ].map(({ label, value, setter }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#3B2F1E' }}>{label}</span>
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
                  <p style={{ margin: 0, fontSize: 10, color: 'rgba(59,47,30,0.4)' }}>
                    ※ 通知機能は現在準備中です
                  </p>
                </div>
              </div>
            </div>

            {/* ── ⑤ MyGarden（他のアコーディオンボックスと同じ見た目・タップで全画面遷移） ── */}
            <Link href="/garden" onClick={onClose} style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{ border: '1px solid #D4B896', borderRadius: 12, padding: '0 12px', marginBottom: 20 }}>
                <div style={{
                  padding: '10px 0', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', cursor: 'pointer',
                }}>
                  <span style={{ fontSize: 12, color: '#8B6914', fontWeight: 600 }}>
                    🌿 MyGarden
                  </span>
                  <span style={{ fontSize: 11, color: '#8B6914' }}>全画面で見る ›</span>
                </div>
              </div>
            </Link>

            {/* ── ⑥ モードを切り替える（モード選択画面を再表示） ── */}
            <button
              onClick={openModeSelect}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 20, marginBottom: 12,
                border: '1px solid #C9A84C', background: '#FBEFC6', color: '#8B6914',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              🔄 モードを切り替える
            </button>

            {/* ── ⑦ ログアウト ── */}
            <button
              onClick={handleLogout}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 20,
                border: '1px solid #8B6914', background: 'transparent', color: '#8B6914',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
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
