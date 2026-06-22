'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { formatHashtag } from '@/app/onboarding/garden-setup/garden-visuals'
import { UserAvatar } from '@/src/components/UserAvatar'

type UserRow = {
  id: string
  username: string
  avatar_url: string | null
}

type Tag = {
  id: string
  text: string
  type: 'light' | 'shadow'
}

type ConnectionStatus = 'none' | 'pending' | 'received' | 'accepted'

function OtherProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetUserId = searchParams.get('userId') ?? ''

  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [user, setUser] = useState<UserRow | null>(null)
  const [daisyTags, setDaisyTags] = useState<Tag[]>([])
  const [seedTags, setSeedTags] = useState<Tag[]>([])
  const [commonTexts, setCommonTexts] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<ConnectionStatus>('none')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [daisyOpen, setDaisyOpen] = useState(false)
  const [showAllCommon, setShowAllCommon] = useState<'daisy' | 'seed' | null>(null)

  useEffect(() => {
    ;(async () => {
      if (targetUserId.startsWith('dummy-')) {
        setLoading(false)
        return
      }

      const uid = sessionStorage.getItem('user_id')
      setMyUserId(uid)

      if (!uid || !targetUserId) {
        setLoading(false)
        return
      }

      if (uid === targetUserId) {
        router.replace('/profile')
        return
      }

      const [userRes, daisyRes, seedRes, myTagsRes, connRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('users') as any)
          .select('id, username, avatar_url')
          .eq('id', targetUserId)
          .single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('tags') as any)
          .select('id, text')
          .eq('user_id', targetUserId)
          .eq('type', 'light')
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
        // Seedタグ（相手のもの）
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('tags') as any)
          .select('id, text')
          .eq('user_id', targetUserId)
          .eq('type', 'shadow')
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
        // 自分のタグ（light + shadow両方）
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('tags') as any)
          .select('text, type')
          .eq('user_id', uid)
          .eq('is_active', true),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('connections') as any)
          .select('id, requester_id, receiver_id, status')
          .or(`and(requester_id.eq.${uid},receiver_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},receiver_id.eq.${uid})`)
          .maybeSingle(),
      ])

      setUser((userRes.data as UserRow) ?? null)

      const myTags = (myTagsRes.data as { text: string; type: string }[]) ?? []
      const myTexts = new Set(myTags.map(t => t.text))
      setCommonTexts(myTexts)
      setDaisyTags((daisyRes.data as Tag[]) ?? [])
      setSeedTags((seedRes.data as Tag[]) ?? [])

      const conn = connRes.data as { id: string; requester_id: string; receiver_id: string; status: string } | null
      if (!conn) {
        setStatus('none')
      } else if (conn.status === 'accepted') {
        setStatus('accepted')
      } else if (conn.requester_id === uid) {
        setStatus('pending')
      } else {
        setStatus('received')
      }

      setLoading(false)
    })()
  }, [targetUserId, router])

  const sendRequest = async () => {
    if (!myUserId || submitting) return
    setSubmitting(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('connections') as any)
      .insert({ requester_id: myUserId, receiver_id: targetUserId, status: 'pending' })
      .select('id')
      .single()

    if (!error && data) {
      setStatus('pending')
    }
    setSubmitting(false)
  }

  const acceptRequest = async () => {
    if (!myUserId || submitting) return
    setSubmitting(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('connections') as any)
      .update({ status: 'accepted' })
      .eq('requester_id', targetUserId)
      .eq('receiver_id', myUserId)

    setStatus('accepted')
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div style={{ background: '#F5F0E8', maxWidth: 390, margin: '0 auto', minHeight: '100svh' }}>
        <p style={{ textAlign: 'center', paddingTop: 80, fontSize: 13, color: '#A09070' }}>読み込み中...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ background: '#F5F0E8', maxWidth: 390, margin: '0 auto', minHeight: '100svh', padding: '24px 16px' }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8B6914', padding: 0, marginBottom: 16 }}
        >
          ‹ 戻る
        </button>
        <p style={{ textAlign: 'center', paddingTop: 60, fontSize: 14, color: '#A09070' }}>
          このユーザーは表示できません
        </p>
      </div>
    )
  }

  const BUTTON_CONFIG: Record<ConnectionStatus, { label: string; bg: string; color: string; disabled: boolean; onClick?: () => void }> = {
    none:     { label: '繋がる 🌼',        bg: '#4A7C59', color: '#F5F0E8', disabled: false, onClick: sendRequest },
    pending:  { label: '申請中…',          bg: '#D4B896', color: '#5C3A1E', disabled: true },
    received: { label: '承認する ✓',       bg: '#4A7C59', color: '#F5F0E8', disabled: false, onClick: acceptRequest },
    accepted: { label: '繋がっています 🌼', bg: '#F5D78E', color: '#8B6914', disabled: true },
  }
  const buttonConfig = BUTTON_CONFIG[status]

  const commonDaisy = daisyTags.filter(t => commonTexts.has(t.text))
  const commonSeed = seedTags.filter(t => commonTexts.has(t.text))

  return (
    <div
      style={{
        background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
        minHeight: '100svh', padding: '24px 16px 100px',
        overflowY: 'auto',
      }}
    >
      <button
        onClick={() => router.back()}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 20, color: '#8B6914', lineHeight: 1, padding: 0,
          marginBottom: 16,
        }}
      >
        ‹ 戻る
      </button>

      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <UserAvatar username={user?.username} avatarUrl={user?.avatar_url} size={64} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 18, fontWeight: 'bold', color: '#3B2F1E', margin: 0 }}>
            {user?.username ?? ''}
          </p>
          <p style={{ fontSize: 13, color: '#8B6914', margin: '4px 0 0' }}>
            @{user?.username ?? ''}
          </p>
        </div>
        <button
          onClick={buttonConfig.onClick}
          disabled={buttonConfig.disabled || submitting}
          style={{
            background: buttonConfig.bg, color: buttonConfig.color,
            border: 'none', borderRadius: 20, padding: '8px 16px',
            fontSize: 12, fontWeight: 700, flexShrink: 0,
            cursor: buttonConfig.disabled || submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {buttonConfig.label}
        </button>
      </div>

      {/* 共通のタグ */}
      {(commonDaisy.length > 0 || commonSeed.length > 0) && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, color: '#8B6914', fontWeight: 700, margin: '0 0 12px' }}>
            🤝 共通のタグ
          </h2>

          {/* 共通Daisy */}
          {commonDaisy.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: '#8B6914', margin: '0 0 6px' }}>🌼 Daisy</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {commonDaisy.slice(0, 5).map(tag => (
                  <span key={tag.id} style={{
                    background: '#4A7C59', color: '#F5F0E8',
                    borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600,
                  }}>{formatHashtag(tag.text)}</span>
                ))}
                {commonDaisy.length > 5 && (
                  <span
                    onClick={() => setShowAllCommon('daisy')}
                    style={{
                      background: 'rgba(74,124,89,0.15)', color: '#4A7C59',
                      borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >+{commonDaisy.length - 5}</span>
                )}
              </div>
            </div>
          )}

          {/* 共通Seed */}
          {commonSeed.length > 0 && (
            <div>
              <p style={{ fontSize: 11, color: '#8B6914', margin: '0 0 6px' }}>🌱 Seed</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {commonSeed.slice(0, 5).map(tag => (
                  <span key={tag.id} style={{
                    background: '#D4B896', color: '#5C3A1E',
                    borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600,
                  }}>{formatHashtag(tag.text)}</span>
                ))}
                {commonSeed.length > 5 && (
                  <span
                    onClick={() => setShowAllCommon('seed')}
                    style={{
                      background: 'rgba(212,184,150,0.3)', color: '#8B6914',
                      borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >+{commonSeed.length - 5}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Daisyタグ（折りたたみ） */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => setDaisyOpen(prev => !prev)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            padding: '0 0 12px',
          }}
        >
          <h2 style={{ fontSize: 14, color: '#8B6914', fontWeight: 700, margin: 0 }}>
            🌼 Daisy（{daisyTags.length}）
          </h2>
          <span style={{ fontSize: 16, color: '#8B6914' }}>{daisyOpen ? '∧' : '∨'}</span>
        </button>
        {daisyOpen && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {daisyTags.length === 0 ? (
              <p style={{ fontSize: 12, color: '#A09070', margin: 0 }}>まだありません</p>
            ) : (
              daisyTags.map(tag => (
                <span key={tag.id} style={{
                  background: commonTexts.has(tag.text) ? '#F5D78E' : '#FDF6E3',
                  color: '#8B6914',
                  border: '1px solid #D4B896',
                  borderRadius: 20, padding: '4px 12px', fontSize: 12,
                }}>{formatHashtag(tag.text)}</span>
              ))
            )}
          </div>
        )}
      </div>

      {/* 共通タグ全表示モーダル */}
      {showAllCommon && (() => {
        const tags = showAllCommon === 'daisy' ? commonDaisy : commonSeed
        const label = showAllCommon === 'daisy' ? '🌼 Daisy 共通タグ' : '🌱 Seed 共通タグ'
        const bg = showAllCommon === 'daisy' ? '#4A7C59' : '#D4B896'
        const color = showAllCommon === 'daisy' ? '#F5F0E8' : '#5C3A1E'
        return (
          <>
            <div
              onClick={() => setShowAllCommon(null)}
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(59,47,30,0.4)', zIndex: 100,
              }}
            />
            <div style={{
              position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
              width: '100%', maxWidth: 390,
              background: '#F5F0E8', borderRadius: '20px 20px 0 0',
              borderTop: '1px solid #D4B896', zIndex: 101,
              padding: '20px 20px 48px',
            }}>
              <div style={{ width: 36, height: 4, background: 'rgba(139,105,20,.25)', borderRadius: 2, margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 14, color: '#8B6914', fontWeight: 700, margin: '0 0 16px' }}>
                {label}（{tags.length}個）
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {tags.map(tag => (
                  <span key={tag.id} style={{
                    background: bg, color: color,
                    borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600,
                  }}>{formatHashtag(tag.text)}</span>
                ))}
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}

export default function OtherProfilePage() {
  return (
    <Suspense fallback={null}>
      <OtherProfileContent />
    </Suspense>
  )
}
