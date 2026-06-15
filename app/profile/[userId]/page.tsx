'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
}

type ConnectionStatus = 'none' | 'pending' | 'received' | 'accepted'

export default function OtherProfilePage() {
  const router = useRouter()
  const params = useParams<{ userId: string }>()
  const targetUserId = params.userId

  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [user, setUser] = useState<UserRow | null>(null)
  const [daisyTags, setDaisyTags] = useState<Tag[]>([])
  const [commonTexts, setCommonTexts] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<ConnectionStatus>('none')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    ;(async () => {
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

      const [userRes, daisyRes, myTagsRes, connRes] = await Promise.all([
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('tags') as any)
          .select('text')
          .eq('user_id', uid)
          .eq('is_active', true),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('connections') as any)
          .select('id, requester_id, receiver_id, status')
          .or(`and(requester_id.eq.${uid},receiver_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},receiver_id.eq.${uid})`)
          .maybeSingle(),
      ])

      setUser((userRes.data as UserRow) ?? null)
      setDaisyTags((daisyRes.data as Tag[]) ?? [])
      setCommonTexts(new Set(((myTagsRes.data as { text: string }[]) ?? []).map(t => t.text)))

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

  const BUTTON_CONFIG: Record<ConnectionStatus, { label: string; bg: string; color: string; disabled: boolean; onClick?: () => void }> = {
    none:     { label: '繋がる 🌼',       bg: '#4A7C59', color: '#F5F0E8', disabled: false, onClick: sendRequest },
    pending:  { label: '申請中…',         bg: '#D4B896', color: '#5C3A1E', disabled: true },
    received: { label: '承認する ✓',      bg: '#4A7C59', color: '#F5F0E8', disabled: false, onClick: acceptRequest },
    accepted: { label: '繋がっています 🌼', bg: '#F5D78E', color: '#8B6914', disabled: true },
  }
  const buttonConfig = BUTTON_CONFIG[status]

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
        <UserAvatar username={user?.username} avatarUrl={user?.avatar_url} size={80} />
        <div>
          <p style={{ fontSize: 20, fontWeight: 'bold', color: '#3B2F1E', margin: 0 }}>
            {user?.username ?? ''}
          </p>
          <p style={{ fontSize: 13, color: '#8B6914', margin: '4px 0 0' }}>
            @{user?.username ?? ''}
          </p>
        </div>
      </div>

      {/* タグ一覧 */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, color: '#8B6914', fontWeight: 700, margin: '0 0 12px' }}>
          🌼 Daisy
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {daisyTags.length === 0 ? (
            <p style={{ fontSize: 12, color: '#A09070', margin: 0 }}>まだありません</p>
          ) : (
            daisyTags.map(tag => {
              const isCommon = commonTexts.has(tag.text)
              return (
                <span
                  key={tag.id}
                  style={{
                    background: isCommon ? '#4A7C59' : '#F5D78E',
                    color: isCommon ? '#F5F0E8' : '#8B6914',
                    borderRadius: 12, padding: '4px 12px', fontSize: 12,
                    fontWeight: isCommon ? 700 : 400,
                  }}
                >
                  {formatHashtag(tag.text)}
                </span>
              )
            })
          )}
        </div>
      </div>

      {/* 繋がりボタン */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
        <button
          onClick={buttonConfig.onClick}
          disabled={buttonConfig.disabled || submitting}
          style={{
            background: buttonConfig.bg, color: buttonConfig.color,
            border: 'none', borderRadius: 20, padding: '10px 32px',
            fontSize: 13, fontWeight: 700,
            cursor: buttonConfig.disabled || submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {buttonConfig.label}
        </button>
      </div>
    </div>
  )
}
