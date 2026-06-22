'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { formatHashtag } from '@/app/onboarding/garden-setup/garden-visuals'
import { BottomNav } from '@/src/components/BottomNav'
import { UserAvatar } from '@/src/components/UserAvatar'

type UserRow = {
  id: string
  username: string
  avatar_url: string | null
}

type Tag = {
  id: string
  text: string
}

type ConnectionUser = {
  id: string
  username: string
  avatar_url: string | null
}

type Connection = {
  id: string
  status: string
  requester_id: string
  receiver_id: string
  requester: ConnectionUser | null
  receiver: ConnectionUser | null
}

export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [user, setUser] = useState<UserRow | null>(null)
  const [lightTags, setLightTags] = useState<Tag[]>([])
  const [shadowTags, setShadowTags] = useState<Tag[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [commonTags, setCommonTags] = useState<Record<string, string[]>>({})
  const [pending, setPending] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [daisyOpen, setDaisyOpen] = useState(false)
  const [seedOpen, setSeedOpen] = useState(false)
  const [connectionsOpen, setConnectionsOpen] = useState(false)

  const loadProfile = async (uid: string) => {
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
    const light = (lightRes.data as Tag[]) ?? []
    const shadow = (shadowRes.data as Tag[]) ?? []
    setLightTags(light)
    setShadowTags(shadow)
    setPending((pendingRes.data as Connection[]) ?? [])

    const conns = (connRes.data as Connection[]) ?? []
    setConnections(conns)

    const otherIds = conns.map(c => (c.requester_id === uid ? c.receiver_id : c.requester_id))
    if (otherIds.length > 0) {
      const ownTexts = new Set([...light, ...shadow].map(t => t.text))
      const { data: otherTags } = await (supabase.from('tags') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select('user_id, text')
        .in('user_id', otherIds)
        .eq('is_active', true)

      const tagsByUser = new Map<string, Set<string>>()
      ;((otherTags as { user_id: string; text: string }[]) ?? []).forEach(t => {
        if (!tagsByUser.has(t.user_id)) tagsByUser.set(t.user_id, new Set())
        tagsByUser.get(t.user_id)!.add(t.text)
      })

      const common: Record<string, string[]> = {}
      conns.forEach(c => {
        const otherId = c.requester_id === uid ? c.receiver_id : c.requester_id
        const otherSet = tagsByUser.get(otherId) ?? new Set<string>()
        common[c.id] = [...ownTexts].filter(t => otherSet.has(t))
      })
      setCommonTags(common)
    } else {
      setCommonTags({})
    }
  }

  useEffect(() => {
    ;(async () => {
      const uid = sessionStorage.getItem('user_id')
      setUserId(uid)
      if (!uid) {
        setLoading(false)
        return
      }
      await loadProfile(uid)
      setLoading(false)
    })()
  }, [])

  // 受信したつながり申請をリアルタイムで反映
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`connections-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'connections',
        filter: `receiver_id=eq.${userId}`,
      }, () => {
        loadProfile(userId)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setUploading(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) {
      console.error('avatar upload error:', uploadError.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('users') as any).update({ avatar_url: publicUrl }).eq('id', userId)

    setUser(prev => (prev ? { ...prev, avatar_url: publicUrl } : prev))
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    sessionStorage.removeItem('user_id')
    sessionStorage.removeItem('username')
    router.push('/welcome')
  }

  if (loading) {
    return (
      <div style={{ background: '#F5F0E8', maxWidth: 390, margin: '0 auto', minHeight: '100svh' }}>
        <p style={{ textAlign: 'center', paddingTop: 80, fontSize: 13, color: '#A09070' }}>読み込み中...</p>
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
        minHeight: '100svh', padding: '24px 16px 100px',
        overflowY: 'auto',
      }}
    >
      {/* ① ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt=""
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 80, height: 80, borderRadius: '50%',
                background: '#4A7C59', color: '#F5F0E8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 700,
              }}
            >
              {(user?.username ?? '?').slice(0, 1).toUpperCase()}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="アイコンを変更"
            style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 28, height: 28, borderRadius: '50%',
              border: '1px solid #D4B896', background: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, cursor: uploading ? 'default' : 'pointer',
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
          <p style={{ fontSize: 20, fontWeight: 'bold', color: '#3B2F1E', margin: 0 }}>
            {user?.username ?? ''}
          </p>
          <p style={{ fontSize: 13, color: '#8B6914', margin: '4px 0 0' }}>
            @{user?.username ?? ''}
          </p>
        </div>
      </div>

      {/* ② タグ一覧 */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, color: '#8B6914', fontWeight: 700, margin: '0 0 12px' }}>
          あなたの言葉
        </h2>

        {/* Daisy アコーディオン */}
        <div style={{ border: '1px solid #D4B896', borderRadius: 12, padding: '0 12px', marginBottom: 12 }}>
          <div
            onClick={() => setDaisyOpen(o => !o)}
            style={{
              background: '#F5F0E8', borderBottom: '1px solid #D4B896',
              padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 12, color: '#8B6914', fontWeight: 600 }}>
              🌼 Daisy（{lightTags.length}）
            </span>
            <span style={{ fontSize: 12, color: '#8B6914' }}>{daisyOpen ? '∧' : '∨'}</span>
          </div>
          <div
            style={{
              maxHeight: daisyOpen ? 1000 : 0,
              opacity: daisyOpen ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.3s ease, opacity 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' }}>
              {lightTags.length === 0 ? (
                <p style={{ fontSize: 12, color: '#A09070', margin: 0 }}>まだありません</p>
              ) : (
                lightTags.map(tag => (
                  <span
                    key={tag.id}
                    style={{
                      background: '#F5D78E', borderRadius: 12, padding: '8px 12px',
                      fontSize: 12, color: '#8B6914', boxSizing: 'border-box',
                    }}
                  >
                    {formatHashtag(tag.text)}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Seed アコーディオン */}
        <div style={{ border: '1px solid #D4B896', borderRadius: 12, padding: '0 12px' }}>
          <div
            onClick={() => setSeedOpen(o => !o)}
            style={{
              background: '#F5F0E8', borderBottom: '1px solid #D4B896',
              padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 12, color: '#8B6914', fontWeight: 600 }}>
              🌱 Seed（{shadowTags.length}）
            </span>
            <span style={{ fontSize: 12, color: '#8B6914' }}>{seedOpen ? '∧' : '∨'}</span>
          </div>
          <div
            style={{
              maxHeight: seedOpen ? 1000 : 0,
              opacity: seedOpen ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.3s ease, opacity 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' }}>
              {shadowTags.length === 0 ? (
                <p style={{ fontSize: 12, color: '#A09070', margin: 0 }}>まだありません</p>
              ) : (
                shadowTags.map(tag => (
                  <span
                    key={tag.id}
                    style={{
                      background: '#D4B896', borderRadius: 12, padding: '8px 12px',
                      fontSize: 12, color: '#5C3A1E', boxSizing: 'border-box',
                    }}
                  >
                    {formatHashtag(tag.text)}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ③ つながり */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, color: '#8B6914', fontWeight: 700, margin: '0 0 12px' }}>
          つながり
        </h2>

        <div style={{ border: '1px solid #D4B896', borderRadius: 12, padding: '0 12px' }}>
          <div
            onClick={() => setConnectionsOpen(o => !o)}
            style={{
              background: '#F5F0E8', borderBottom: '1px solid #D4B896',
              padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 12, color: '#8B6914', fontWeight: 600 }}>
              つながり（{connections.length}）
            </span>
            <span style={{ fontSize: 12, color: '#8B6914' }}>{connectionsOpen ? '∧' : '∨'}</span>
          </div>
          <div
            style={{
              maxHeight: connectionsOpen ? 1000 : 0,
              opacity: connectionsOpen ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.3s ease, opacity 0.3s ease',
            }}
          >
            <div style={{ padding: '12px 0' }}>
              {connections.length === 0 ? (
                <p style={{ fontSize: 13, color: '#A09070', textAlign: 'center', margin: 0 }}>
                  まだつながりがありません。ルームで話しかけてみよう🌼
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {connections.map(conn => {
                    const other = conn.requester_id === userId ? conn.receiver : conn.requester
                    const common = commonTags[conn.id] ?? []
                    return (
                      <div
                        key={conn.id}
                        onClick={() => other && router.push(`/profile/view?userId=${other.id}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: other ? 'pointer' : 'default' }}
                      >
                        <UserAvatar username={other?.username} avatarUrl={other?.avatar_url} size={40} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#3B2F1E' }}>
                            {other?.username}
                          </p>
                          {common.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                              {common.map(text => (
                                <span
                                  key={text}
                                  style={{
                                    background: '#F5D78E', borderRadius: 12, padding: '2px 10px',
                                    fontSize: 11, color: '#8B6914',
                                  }}
                                >
                                  {formatHashtag(text)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ④ つながり申請 */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, color: '#8B6914', fontWeight: 700, margin: '0 0 12px' }}>
            つながり申請（{pending.length}）
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.map(req => (
              <div key={req.id} style={{ background: '#FFFFFF', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <UserAvatar username={req.requester?.username} avatarUrl={req.requester?.avatar_url} size={40} />
                  <p style={{ margin: 0, fontSize: 13, color: '#3B2F1E' }}>
                    {req.requester?.username}さんから申請が届いています
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

      {/* ⑤ ログアウト */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent', border: '1px solid #8B6914',
            color: '#8B6914', borderRadius: 20, padding: '10px 32px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          ログアウト
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
