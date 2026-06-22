'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'

type Friend = {
  id: string
  username: string
  avatar_url: string | null
}

type ConnectionRow = {
  requester_id: string
  receiver_id: string
  requester: Friend | null
  receiver: Friend | null
}

export default function FriendRoomView() {
  const router = useRouter()
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const myUserId = sessionStorage.getItem('user_id')
      if (!myUserId) {
        setLoading(false)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: connections } = await (supabase.from('connections') as any)
        .select('requester_id, receiver_id, requester:users!requester_id(id, username, avatar_url), receiver:users!receiver_id(id, username, avatar_url)')
        .or(`requester_id.eq.${myUserId},receiver_id.eq.${myUserId}`)
        .eq('status', 'accepted')

      const list = ((connections as ConnectionRow[]) ?? [])
        .map(c => (c.requester_id === myUserId ? c.receiver : c.requester))
        .filter((f): f is Friend => f !== null)

      setFriends(list)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <p style={{ textAlign: 'center', padding: '48px 24px', fontSize: 13, color: '#A09070' }}>
        読み込み中...
      </p>
    )
  }

  if (friends.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: '#A09070', fontSize: 14 }}>
        <p>まだFriendがいません🌼</p>
        <p style={{ fontSize: 12, marginTop: 8 }}>
          DaisyやSeedのルームで話しかけてみよう
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        overflowX: 'auto',
        gap: 16,
        padding: 16,
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {friends.map(friend => (
        <div
          key={friend.id}
          onClick={() => router.push(`/room/friend/chat?friendId=${friend.id}`)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            scrollSnapAlign: 'start',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {/* アイコン（ストーリーリング付き） */}
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            padding: 2,
            background: 'linear-gradient(135deg, #4A7C59, #F5D78E)',
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '2px solid #F5F0E8',
              overflow: 'hidden',
              background: '#4A7C59',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {friend.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={friend.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#F5F0E8', fontSize: 20, fontWeight: 'bold' }}>
                  {friend.username?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
          </div>
          {/* ユーザーネーム */}
          <span style={{
            fontSize: 11,
            color: '#3B2F1E',
            maxWidth: 64,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {friend.username}
          </span>
        </div>
      ))}
    </div>
  )
}
