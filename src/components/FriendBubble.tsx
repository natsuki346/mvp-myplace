'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'

type RawFriend = {
  id: string
  username: string
  avatarUrl: string | null
  msgCount: number
}

type SimNode = RawFriend & {
  radius: number
  x: number
  y: number
  vx: number
  vy: number
}

const MIN_SIZE = 40
const MAX_SIZE = 80
const CANVAS_H = 420

function lerp(t: number, a: number, b: number) {
  return a + t * (b - a)
}

export default function FriendBubble() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [friends, setFriends] = useState<RawFriend[] | null>(null)
  const [simNodes, setSimNodes] = useState<SimNode[]>([])

  // ── データフェッチ ──
  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    if (!userId) { setFriends([]); return }
    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [connRes, msgRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('connections') as any)
          .select('requester_id, receiver_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('friend_messages') as any)
          .select('sender_id, receiver_id')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
      ])

      const connections: { requester_id: string; receiver_id: string }[] = connRes.data ?? []
      const friendIds = connections.map(c =>
        c.requester_id === userId ? c.receiver_id : c.requester_id,
      )

      if (friendIds.length === 0) { setFriends([]); return }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usersRes = await (supabase.from('users') as any)
        .select('id, username, avatar_url')
        .in('id', friendIds)

      const usersMap = new Map<string, { username: string; avatar_url: string | null }>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((usersRes.data ?? []) as any[]).map((u: any) => [u.id as string, u]),
      )

      const msgCounts = new Map<string, number>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const msg of ((msgRes.data ?? []) as any[])) {
        const fid: string = msg.sender_id === userId ? msg.receiver_id : msg.sender_id
        msgCounts.set(fid, (msgCounts.get(fid) ?? 0) + 1)
      }

      setFriends(
        friendIds
          .filter(fid => usersMap.has(fid))
          .map(fid => {
            const u = usersMap.get(fid)!
            return {
              id: fid,
              username: u.username ?? '?',
              avatarUrl: u.avatar_url ?? null,
              msgCount: msgCounts.get(fid) ?? 0,
            }
          }),
      )
    })()
  }, [])

  // ── d3-force シミュレーション ──
  useEffect(() => {
    if (!friends || friends.length === 0) return

    const w = containerRef.current?.clientWidth ?? 330
    const h = CANVAS_H
    const cx = w / 2
    const cy = h / 2

    const maxMsg = Math.max(...friends.map(f => f.msgCount), 1)
    const maxRadius = Math.min(cx, cy) * 0.75

    const initialNodes: SimNode[] = friends.map(f => {
      const normalized = f.msgCount / maxMsg
      const radius = Math.round(lerp(normalized, MIN_SIZE, MAX_SIZE) / 2)
      const angle = Math.random() * 2 * Math.PI
      const dist = maxRadius * (1 - normalized) + (Math.random() - 0.5) * 40
      return {
        ...f,
        radius,
        x: cx + dist * Math.cos(angle),
        y: cy + dist * Math.sin(angle),
        vx: 0,
        vy: 0,
      }
    })

    import('d3-force').then(({ forceSimulation, forceCenter, forceManyBody, forceCollide, forceRadial }) => {
      const sim = forceSimulation<SimNode>(initialNodes)
        .force('center', forceCenter(cx, cy))
        .force('charge', forceManyBody<SimNode>().strength(-50))
        .force('collide', forceCollide<SimNode>(n => n.radius + 8))
        .force(
          'radial',
          forceRadial<SimNode>(
            n => maxRadius * (1 - n.msgCount / maxMsg),
            cx, cy,
          ).strength(0.4),
        )
        .stop()

      sim.tick(300)

      setSimNodes([...initialNodes])
    })
  }, [friends])

  // ── ローディング ──
  if (friends === null) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 60, fontSize: 13, color: 'rgba(59,47,30,0.4)' }}>
        読み込み中...
      </div>
    )
  }

  if (friends.length === 0) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 60 }}>
        <p style={{ fontSize: 14, color: 'rgba(59,47,30,0.4)', margin: 0 }}>
          まだフレンドがいません
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: CANVAS_H, overflow: 'hidden' }}
    >
      {simNodes.map(node => {
        const size = node.radius * 2
        const fontSize = Math.max(8, Math.round(size * 0.13))
        const avatarSz = Math.round(size * 0.42)
        return (
          <button
            key={node.id}
            onClick={() => router.push(`/profile/view?userId=${node.id}`)}
            style={{
              position: 'absolute',
              left: node.x - node.radius,
              top: node.y - node.radius,
              width: size, height: size,
              borderRadius: '50%',
              background: '#F5D78E',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 2,
              overflow: 'hidden',
              boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
              userSelect: 'none',
            }}
          >
            <div style={{
              width: avatarSz, height: avatarSz, borderRadius: '50%',
              overflow: 'hidden', flexShrink: 0,
              background: 'rgba(255,255,255,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: Math.round(avatarSz * 0.5), fontWeight: 700,
              color: '#7A5C00',
            }}>
              {node.avatarUrl
                ? <img src={node.avatarUrl} alt={node.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (node.username[0]?.toUpperCase() ?? '?')
              }
            </div>
            <span style={{
              fontSize, fontWeight: 600, color: '#7A5C00',
              maxWidth: size - 8, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              marginTop: 1,
            }}>
              {node.username}
            </span>
          </button>
        )
      })}
    </div>
  )
}
