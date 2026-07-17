'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import TagWordsModal from '@/src/components/TagWordsModal'

// MyGarden（/garden）専用のタグクラウド表示。
// 通常のガーデン（garden-display.tsx のバブル表示）はチュートリアル・オンボーディング等
// 他画面でも使うため、こちらは独立コンポーネントとして実装している。

type Tab = 'light' | 'shadow' | 'friend'

// Daisy/Seed はタグ、Friend はフレンド。score でフォントサイズを決める。
type CloudItem = {
  id: string
  text: string          // Daisy/Seed: タグ名 / Friend: username
  color: string | null
  score: number | null  // Daisy/Seed: growth_point / Friend: メッセージ数
  isFriend: boolean
}

const DEFAULT_COLOR = '#5C4A1E'

// スコア降順の配列を「中央に大きいもの・外側に小さいもの」が来る山型の並びに変換する。
// 例: [a(最大),b,c,d,e] → [d,b,a,c,e]
function centerHeavy<T>(sortedDesc: T[]): T[] {
  const res: T[] = []
  sortedDesc.forEach((item, i) => {
    if (i % 2 === 0) res.push(item)
    else res.unshift(item)
  })
  return res
}

const TAB_META: Record<Tab, { label: string; bg: string; text: string }> = {
  light:  { label: '🌼 Daisy',  bg: '#F5D78E', text: '#7A5C00' },
  shadow: { label: '🌱 Seed',   bg: '#D4B896', text: '#6B4E1A' },
  friend: { label: '🤝 Friend', bg: '#B8D4E8', text: '#2C5F7A' },
}

// embedded: プロフィールなどスクロールするページ内に埋め込むモード。
// 内部で overflowY:auto を持たず、コンテンツの高さぶんだけ伸びる（＝親ページと
// 一緒に縦スクロールする）。全画面 /garden では embedded=false で内部スクロールする。
export default function GardenTagCloud({ embedded = false }: { embedded?: boolean } = {}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('light')
  const [lightTags, setLightTags]   = useState<CloudItem[]>([])
  const [shadowTags, setShadowTags] = useState<CloudItem[]>([])
  const [friends, setFriends]       = useState<CloudItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<CloudItem | null>(null)

  // ── ドラッグ／ピンチで動かせるキャンバス（全画面 /garden のみ。埋め込みはページスクロール） ──
  const [offset, setOffset]   = useState({ x: 0, y: 0 })
  const [scale, setScale]     = useState(1)
  const [dragging, setDragging] = useState(false)
  const dragStart  = useRef({ x: 0, y: 0 })
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null)
  const movedRef   = useRef(false)   // ドラッグ直後の誤タップ抑制用

  const clampScale = (s: number) => Math.min(2, Math.max(0.5, s))
  const touchDist = (a: React.Touch, b: React.Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true); movedRef.current = false
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    const nx = e.clientX - dragStart.current.x
    const ny = e.clientY - dragStart.current.y
    if (Math.abs(nx - offset.x) + Math.abs(ny - offset.y) > 3) movedRef.current = true
    setOffset({ x: nx, y: ny })
  }
  const endDrag = () => setDragging(false)

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchStart.current = { dist: touchDist(e.touches[0], e.touches[1]), scale }
    } else if (e.touches.length === 1) {
      setDragging(true); movedRef.current = false
      dragStart.current = { x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y }
    }
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      const d = touchDist(e.touches[0], e.touches[1])
      setScale(clampScale(pinchStart.current.scale * (d / pinchStart.current.dist)))
      movedRef.current = true
    } else if (dragging && e.touches.length === 1) {
      const nx = e.touches[0].clientX - dragStart.current.x
      const ny = e.touches[0].clientY - dragStart.current.y
      if (Math.abs(nx - offset.x) + Math.abs(ny - offset.y) > 3) movedRef.current = true
      setOffset({ x: nx, y: ny })
    }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) { setDragging(false); pinchStart.current = null }
  }

  // ── タグ（Daisy/Seed）フェッチ ──
  useEffect(() => {
    const uid = localStorage.getItem('user_id')
    if (!uid) { setLoading(false); return }
    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('tags') as any)
        .select('id, text, color, type, growth_point')
        .eq('user_id', uid)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      const rows = (data as { id: string; text: string; color: string | null; type: string; growth_point: number | null }[]) ?? []
      const toItem = (t: typeof rows[number]): CloudItem => ({
        id: t.id, text: t.text, color: t.color, score: t.growth_point, isFriend: false,
      })
      setLightTags(rows.filter(t => t.type === 'light').map(toItem))
      setShadowTags(rows.filter(t => t.type === 'shadow').map(toItem))
      setLoading(false)
    })()
  }, [])

  // ── フレンドフェッチ（メッセージ数をスコアに） ──
  useEffect(() => {
    const uid = localStorage.getItem('user_id')
    if (!uid) return
    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [connRes, msgRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('connections') as any)
          .select('requester_id, receiver_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${uid},receiver_id.eq.${uid}`),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('friend_messages') as any)
          .select('sender_id, receiver_id')
          .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`),
      ])

      const connections: { requester_id: string; receiver_id: string }[] = connRes.data ?? []
      const friendIds = connections.map(c => (c.requester_id === uid ? c.receiver_id : c.requester_id))
      if (friendIds.length === 0) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usersRes = await (supabase.from('users') as any)
        .select('id, username')
        .in('id', friendIds)
      const usersMap = new Map<string, string>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((usersRes.data ?? []) as any[]).map((u: any) => [u.id as string, (u.username ?? '?') as string]),
      )

      const msgCounts = new Map<string, number>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const m of ((msgRes.data ?? []) as any[])) {
        const fid: string = m.sender_id === uid ? m.receiver_id : m.sender_id
        msgCounts.set(fid, (msgCounts.get(fid) ?? 0) + 1)
      }

      setFriends(
        friendIds.filter(fid => usersMap.has(fid)).map(fid => ({
          id: fid,
          text: usersMap.get(fid)!,
          color: null,
          score: msgCounts.get(fid) ?? 0,
          isFriend: true,
        })),
      )
    })()
  }, [])

  const items = tab === 'light' ? lightTags : tab === 'shadow' ? shadowTags : friends

  const handleTap = (item: CloudItem) => {
    if (movedRef.current) return   // ドラッグ／ピンチ直後のタップは開かない
    if (item.isFriend) {
      router.push(`/profile/view?userId=${item.id}`)
      return
    }
    setSelected(item)
  }

  return (
    <div style={embedded
      ? { display: 'flex', flexDirection: 'column' }
      : { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* ── タブ ── */}
      <div style={{ display: 'flex', gap: 8, padding: embedded ? '0 4px' : '0 20px', marginBottom: 16, flexShrink: 0 }}>
        {(['light', 'shadow', 'friend'] as Tab[]).map(t => {
          const meta = TAB_META[t]
          const active = tab === t
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
                background: active ? meta.bg : 'rgba(59,47,30,0.07)',
                color: active ? meta.text : 'rgba(59,47,30,0.4)',
                fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer',
                transition: 'background 0.2s ease, color 0.2s ease',
              }}
            >
              {meta.label}
            </button>
          )
        })}
      </div>

      {/* ── タグクラウド ──
          ・全画面（!embedded）: overflow:hidden の中でドラッグ／ピンチで自由に動かせるキャンバス
          ・埋め込み（embedded）: 高さを区切らずページと一緒に流れる（＝ページスクロールで全部見える） */}
      <div
        style={embedded ? {
          padding: '10px 8px',
          background: '#FBF7EF',
          border: '1px solid rgba(212,184,150,0.6)',
          borderRadius: 16,
        } : {
          flex: 1, position: 'relative', overflow: 'hidden',
          touchAction: 'none',
          userSelect: 'none', WebkitUserSelect: 'none',
          cursor: dragging ? 'grabbing' : 'grab',
        }}
        {...(!embedded ? {
          onMouseDown, onMouseMove, onMouseUp: endDrag, onMouseLeave: endDrag,
          onTouchStart, onTouchMove, onTouchEnd,
        } : {})}
      >
        {loading ? (
          <p style={{ textAlign: 'center', paddingTop: 40, fontSize: 13, color: 'rgba(59,47,30,0.4)' }}>
            読み込み中...
          </p>
        ) : items.length === 0 ? (
          <p style={{ textAlign: 'center', paddingTop: 40, fontSize: 13, color: 'rgba(59,47,30,0.4)' }}>
            {tab === 'friend' ? 'まだフレンドがいません' : 'タグがありません'}
          </p>
        ) : (
          (() => {
            // スコアの最小〜最大で相対的にサイズを決め、値の差が小さくても大小がはっきり出るようにする
            const scores = items.map(it => it.score ?? 0)
            const minS = Math.min(...scores)
            const maxS = Math.max(...scores)
            const cloud = (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 10,
                justifyContent: 'center', alignItems: 'center',
                alignContent: embedded ? 'flex-start' : 'center',
                padding: embedded ? 0 : '0 20px',
              }}>
                {/* 高ポイントほど中央・大きく、低いものは外側・小さく */}
                {centerHeavy([...items].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))).map(item => {
                  const t = maxS === minS ? 0.5 : ((item.score ?? 0) - minS) / (maxS - minS)
                  const fontSize = Math.round(15 + t * 15)      // 15〜30px
                  const fontWeight = t > 0.66 ? 700 : t > 0.33 ? 600 : 500
                  const color = item.color ?? DEFAULT_COLOR
                  const isSel = selected?.id === item.id
                  return (
                    <span
                      key={item.id}
                      onClick={() => handleTap(item)}
                      style={{
                        fontSize, fontWeight,
                        color: '#3B2F1E',              // テキストは濃色ではっきり
                        background: isSel ? `${color}26` : '#FFFFFF',
                        border: `1.5px solid ${color}66`,
                        borderRadius: 14,
                        boxShadow: '0 1px 3px rgba(59,47,30,0.08)',
                        padding: `${Math.round(fontSize * 0.4)}px ${Math.round(fontSize * 0.7)}px`,
                        cursor: 'pointer', lineHeight: 1.2, whiteSpace: 'nowrap',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {item.isFriend ? item.text : `#${item.text.replace(/^#+/, '')}`}
                    </span>
                  )
                })}
              </div>
            )
            // 埋め込みはそのまま流す。全画面はドラッグ移動用に transform ラッパーで包む
            return embedded ? cloud : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                transition: dragging ? 'none' : 'transform 0.12s ease',
              }}>
                {cloud}
              </div>
            )
          })()
        )}
      </div>

      {/* ── タグ別の保存言葉・日記モーダル（Daisy/Seedのみ） ── */}
      {selected && (
        <TagWordsModal
          tagId={selected.id}
          tagText={selected.text}
          tagColor={selected.color}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
