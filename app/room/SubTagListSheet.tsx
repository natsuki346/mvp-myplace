'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { getMatchingTags } from '@/src/lib/supabase/rooms'
import { getSubTags, type SubTag } from '@/src/lib/supabase/subtags'
import { formatHashtag } from '@/app/onboarding/garden-setup/garden-visuals'
import CreateChannelModal from './CreateChannelModal'

type RoomType = 'light' | 'shadow'

type RoomMember = {
  id: string
  username: string
  avatar_url: string | null
}

export type SelectedChannel = { subTagId: string | null; name: string }

export default function SubTagListSheet({
  type,
  tag,
  onClose,
  onSelect,
}: {
  type: RoomType
  tag: { id: string; text: string }
  onClose: () => void
  onSelect: (channel: SelectedChannel) => void
}) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [subTags, setSubTags] = useState<SubTag[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [matchTagIds, setMatchTagIds] = useState<string[]>([])
  const [showMembers, setShowMembers] = useState(false)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const ids = await getMatchingTags(tag.text, type)
      const data = await getSubTags(ids.length > 0 ? ids : [tag.id])
      if (!cancelled) {
        setMatchTagIds(ids.length > 0 ? ids : [tag.id])
        setSubTags(data)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [tag.id, tag.text, type])

  useEffect(() => {
    if (!showMembers || matchTagIds.length === 0) return
    setMembersLoading(true)
    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('messages') as any)
        .select('user_id, users ( id, username, avatar_url )')
        .in('tag_id', matchTagIds)
        .is('sub_tag_id', null)
        .order('created_at', { ascending: false })
      if (!data) { setMembersLoading(false); return }
      const seen = new Map<string, RoomMember>()
      for (const row of data as { user_id: string; users: RoomMember }[]) {
        if (row.users && !seen.has(row.user_id)) {
          seen.set(row.user_id, row.users)
        }
      }
      setMembers(Array.from(seen.values()))
      setMembersLoading(false)
    })()
  }, [showMembers, matchTagIds])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const handleCreated = (subTag: SubTag) => {
    setSubTags(prev => [...prev, subTag])
    setShowCreate(false)
    handleSelect({ subTagId: subTag.id, name: subTag.name })
  }

  const handleSelect = (channel: SelectedChannel) => {
    onSelect(channel)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 290, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      {/* 背景オーバーレイ */}
      <div
        onClick={close}
        style={{
          position: 'absolute', inset: 0,
          background: visible ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
          transition: 'background 0.3s ease',
        }}
      />

      {/* シート本体 */}
      <div
        className="flex flex-col"
        style={{
          position: 'relative', width: '100%', maxWidth: 390, height: '100%',
          background: '#F5F0E8',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s ease',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          flexShrink: 0, padding: '16px 20px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 12,
          position: 'relative',
        }}>
          <div style={{ display: 'inline-block', minWidth: 120 }}>
            <button
              onClick={close}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#3B2F1E', padding: 0 }}
            >← 戻る</button>
          </div>

          <p style={{ flex: 1, margin: 0, fontSize: 15, fontWeight: 700, color: '#3B2F1E', textAlign: 'center' }}>
            {formatHashtag(tag.text)}
          </p>

          <button
            onClick={() => setShowMembers(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 22, padding: 4, color: '#4A7C59',
            }}
            aria-label="メンバー一覧"
          >👥</button>
        </div>

        {/* チャンネル一覧 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* ALL */}
          <div>
            <button
              onClick={() => handleSelect({ subTagId: null, name: tag.text })}
              style={{
                display: 'flex', alignItems: 'center', width: '100%', height: 56, padding: '0 20px',
                background: '#D4EED8', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: '#4A7C59' }}>💬 ALL</span>
            </button>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(59,47,30,0.5)', marginTop: 24 }}>読み込み中...</p>
          ) : (
            subTags.map(st => (
              <button
                key={st.id}
                onClick={() => handleSelect({ subTagId: st.id, name: st.name })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%', height: 56, padding: '0 20px',
                  background: '#FFFFFF', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ color: '#8B6914', fontSize: 14, fontWeight: 600 }}>#</span>
                <span style={{ fontSize: 14, color: '#3B2F1E' }}>{st.name}</span>
              </button>
            ))
          )}

          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'block', width: '100%', padding: 16, textAlign: 'left',
              background: 'none', border: 'none',
              color: '#4A7C59', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >＋ チャンネルを作る</button>
        </div>
      </div>

      {showCreate && (
        <CreateChannelModal
          parentTagId={tag.id}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {/* メンバーボトムシート */}
      {showMembers && (
        <>
          <div
            onClick={() => setShowMembers(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(59,47,30,0.4)', zIndex: 50 }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 390,
            background: '#F5F0E8', borderRadius: '20px 20px 0 0',
            borderTop: '1px solid #D4B896', zIndex: 51,
            paddingBottom: 40,
          }}>
            <div style={{ width: 36, height: 4, background: 'rgba(139,105,20,.25)', borderRadius: 2, margin: '10px auto 0' }} />
            <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 14, color: '#8B6914', fontWeight: 700, margin: 0 }}>
                👥 メンバー（{members.length}人）
              </h3>
              <button
                onClick={() => setShowMembers(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#A09070' }}
              >✕</button>
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {membersLoading ? (
                <p style={{ textAlign: 'center', padding: 24, fontSize: 13, color: '#A09070' }}>読み込み中...</p>
              ) : members.length === 0 ? (
                <p style={{ textAlign: 'center', padding: 24, fontSize: 13, color: '#A09070' }}>まだメンバーがいません</p>
              ) : (
                members.map(member => (
                  <div
                    key={member.id}
                    onClick={() => {
                      setShowMembers(false)
                      const myId = sessionStorage.getItem('user_id')
                      if (member.id === myId) { router.push('/profile'); return }
                      router.push(`/profile/view?userId=${member.id}`)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', cursor: 'pointer',
                      borderBottom: '0.5px solid rgba(139,105,20,0.1)',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: '#4A7C59', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: '#F5F0E8',
                      fontSize: 16, fontWeight: 'bold', overflow: 'hidden', flexShrink: 0,
                    }}>
                      {member.avatar_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span>{member.username[0].toUpperCase()}</span>
                      }
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#3B2F1E', margin: 0 }}>
                        {member.username}
                      </p>
                      <p style={{ fontSize: 11, color: '#8B6914', margin: '2px 0 0' }}>
                        @{member.username}
                      </p>
                    </div>
                    <div style={{ marginLeft: 'auto', color: '#D4B896', fontSize: 16 }}>›</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
