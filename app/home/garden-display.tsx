'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import GrowthTransitionOverlay from '@/src/components/tree/GrowthTransitionOverlay'
import ThankYouModal from '@/src/components/tutorial/ThankYouModal'
import BubbleDetailModal from '@/src/components/BubbleDetailModal'
import BubbleGrowthPopup from '@/src/components/garden/BubbleGrowthPopup'
import GrowthExplainModal from '@/src/components/onboarding/GrowthExplainModal'
import GrowthModal from '@/src/components/tutorial/GrowthModal'
import HelpModal from '@/src/components/HelpModal'
import DaisyBubble from '@/src/components/DaisyBubble'

type LightTag  = { id: string; text: string; growth_point: number; position_x?: number | null; position_y?: number | null }
type ShadowTag = { id: string; text: string; seed_weight: string | null; stage: string | null; position_x?: number | null; position_y?: number | null }
type FriendBubble = {
  id: string              // friend の user ID
  text: string            // username（表示・key用）
  username: string
  avatarUrl: string | null
  msgCount: number
  level: 1 | 2 | 3
  position_x?: number | null
  position_y?: number | null
}
type AnyTag    = LightTag | ShadowTag | FriendBubble
type TabType   = 'light' | 'shadow' | 'friend'

const BASE_FRIEND_SIZE = 68
const FRIEND_LEVEL_SIZES: Record<1 | 2 | 3, number> = {
  1: BASE_FRIEND_SIZE,
  2: Math.round(BASE_FRIEND_SIZE * 1.2),
  3: Math.round(BASE_FRIEND_SIZE * 1.4),
}
const FRIEND_LEVEL_COLORS: Record<1 | 2 | 3, { bg: string; text: string }> = {
  1: { bg: '#B8D4E8', text: '#2C5F7A' },
  2: { bg: '#F5E8A0', text: '#7A6A00' },
  3: { bg: '#E88080', text: '#7A1F1F' },
}

function getDaisyEmoji(gp: number): string {
  if (gp <= 2) return '🌱'
  if (gp <= 5) return '🌸'
  return '🌼'
}

// seed_weight（数値 or 文字列）からバブルスタイルを決定
// 数値: 0〜2=seed, 3〜6=sprout, 7〜=bloom
// 旧フォーマット文字列('light'/'heavy')は stage で判定
function getSeedBubble(stage: string | null, seedWeight: string | null): { emoji: string; bg: string; text: string } {
  const sw = parseFloat(String(seedWeight ?? ''))
  if (!isNaN(sw)) {
    if (sw >= 7) return { emoji: '🌼', bg: '#F5D78E', text: '#7A5C00' }
    if (sw >= 3) return { emoji: '🌿', bg: '#9DC08B', text: '#2D5A27' }
    return { emoji: '🌱', bg: '#D4B896', text: '#6B4E1A' }
  }
  // 旧フォーマット：stage 文字列で判定
  if (stage === 'bloom')                      return { emoji: '🌼', bg: '#F5D78E', text: '#7A5C00' }
  if (stage === 'bud' || stage === 'budding') return { emoji: '🌿', bg: '#9DC08B', text: '#2D5A27' }
  if (stage === 'sprout')                     return { emoji: '🌿', bg: '#9DC08B', text: '#2D5A27' }
  return { emoji: '🌱', bg: '#D4B896', text: '#6B4E1A' }
}

const BASE_SEED_SIZE = 68

function getSeedSize(seedWeight: string | null): number {
  const sw = parseFloat(String(seedWeight ?? ''))
  if (!isNaN(sw)) {
    if (sw >= 7) return Math.round(BASE_SEED_SIZE * 1.4)  // 95
    if (sw >= 3) return Math.round(BASE_SEED_SIZE * 1.2)  // 82
    return BASE_SEED_SIZE                                  // 68
  }
  if (seedWeight === 'heavy') return Math.round(BASE_SEED_SIZE * 1.4)
  return BASE_SEED_SIZE
}

function clamp(v: number, min: number, max: number) { return Math.min(Math.max(v, min), max) }

function getDaisySize(gp: number): number {
  if (gp >= 30) return 100
  if (gp >= 20) return 84
  if (gp >= 10) return 68
  return 52
}

function getConsecutiveDays(dates: string[]): number {
  if (!dates.length) return 0
  const days = [...new Set(dates.map(d => d.slice(0, 10)))].sort().reverse()
  const today = new Date().toISOString().slice(0, 10)
  if (days[0] !== today) return 0
  let count = 1
  for (let i = 0; i < days.length - 1; i++) {
    const diff = (new Date(days[i]).getTime() - new Date(days[i + 1]).getTime()) / 86400000
    if (diff === 1) count++
    else break
  }
  return count
}

type StoredPos = { x?: number | null; y?: number | null }

// ── 配置アルゴリズム ──
// 重なりを最優先で排除。Y方向は最大1200pxまで拡張してスクロールで対応。
// 1. 大きい順にソート
// 2. 最大500回ランダム試行（gap=12px）
// 3. 全試行失敗 → 既存バブルの最下部に積み上げ（gap=20px、必ず非重複）
function generatePositions(
  count: number,
  w: number,
  sizes: number[],
  storedPos?: StoredPos[],
): Array<{ x: number; y: number }> {
  if (count === 0) return []

  const result: Array<{ x: number; y: number }> = Array.from({ length: count }, () => ({ x: 0, y: 0 }))
  const placed: Array<{ cx: number; cy: number; r: number }> = []

  // Phase 0: 両方非ゼロの保存済み座標はそのまま使う
  const needsGen: number[] = []
  for (let i = 0; i < count; i++) {
    const sp = storedPos?.[i]
    const r  = (sizes[i] ?? 52) / 2
    if (sp && sp.x != null && sp.x !== 0 && sp.y != null && sp.y !== 0) {
      result[i] = { x: sp.x, y: sp.y }
      placed.push({ cx: sp.x + r, cy: sp.y + r, r })
    } else {
      needsGen.push(i)
    }
  }
  if (needsGen.length === 0) return result

  // 直径の大きい順に処理
  const order = [...needsGen].sort((a, b) => (sizes[b] ?? 0) - (sizes[a] ?? 0))

  const GAP = 20
  const noOverlap = (cx: number, cy: number, r: number): boolean =>
    placed.every(p => Math.hypot(cx - p.cx, cy - p.cy) >= r + p.r + GAP)

  for (const idx of order) {
    const r   = (sizes[idx] ?? 52) / 2
    const loX = r + 10
    const hiX = w - r - 10
    const loY = r + 10

    let cx = 0, cy = 0
    let found = false

    // 最大500回ランダム試行（Y 上限 1200px）
    for (let t = 0; t < 500 && !found; t++) {
      const tx = loX + Math.random() * Math.max(0, hiX - loX)
      const ty = loY + Math.random() * Math.max(0, 1200 - r - loY)
      if (noOverlap(tx, ty, r)) { cx = tx; cy = ty; found = true }
    }

    // 全試行失敗 → Y方向に積み上げ、X はランダム（中央集中を防ぐ）
    if (!found) {
      cx = loX + Math.random() * Math.max(0, hiX - loX)
      cy = placed.length > 0
        ? Math.max(...placed.map(p => p.cy + p.r)) + r + GAP + 10
        : r + 10
    }

    placed.push({ cx, cy, r })
    result[idx] = { x: cx - r, y: cy - r }
  }

  return result
}

const DAISY_LEGEND = [
  { emoji: '🌱', label: 'はじめて' },
  { emoji: '🌸', label: 'なじんでる' },
  { emoji: '🌼', label: 'つながれた' },
]
const SEED_LEGEND = [
  { emoji: '🌱', label: 'seed' },
  { emoji: '🌿', label: 'sprout' },
  { emoji: '🌼', label: 'bloom' },
]
const FRIEND_LEGEND = [
  { emoji: '🤝', label: 'つながった' },
  { emoji: '💛', label: 'なかよし' },
  { emoji: '❤️', label: 'しんゆう' },
]

// canvasH は positions から動的に算出するため定数不要

export default function GardenDisplay() {
  const { step, advanceStep } = useTutorialStep()
  const router = useRouter()

  const [tab, setTab]                   = useState<TabType>('light')
  const [lightTags, setLightTags]       = useState<LightTag[]>([])
  const [shadowTags, setShadowTags]     = useState<ShadowTag[]>([])
  const [friendBubbles, setFriendBubbles] = useState<FriendBubble[]>([])
  const [eventCount, setEventCount]     = useState(0)
  const [consecutiveDays, setConsecutiveDays] = useState(0)
  const [loading, setLoading]           = useState(true)
  const [visible, setVisible]           = useState(false)
  const [containerW, setContainerW]     = useState(330)
  const [pan, setPan]                   = useState({ x: 0, y: 0 })

  const [selectedBubble, setSelectedBubble] = useState<{ tagId: string; tagText: string; tagType: 'light' | 'shadow' } | null>(null)

  const [expandedTagId, setExpandedTagId]           = useState<string | null>(null)
  const [showGrowthPopup, setShowGrowthPopup]       = useState(false)
  const [growingTagId, setGrowingTagId]             = useState<string | null>(null)
  const [toastVisible, setToastVisible]             = useState(false)
  const [showFinalAnimation, setShowFinalAnimation] = useState(false)
  const [showThankYou, setShowThankYou]             = useState(false)
  const [pendingOnboardingTagId, setPendingOnboardingTagId] = useState<string | null>(null)
  const [showCompleteAnimation, setShowCompleteAnimation]   = useState(false)
  const [showHelp, setShowHelp]                             = useState(false)

  // ドラッグ用 ref
  const dragRef    = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const isDragging = useRef(false)

  // ── データフェッチ ──
  useEffect(() => {
    const userId = sessionStorage.getItem('user_id')
    if (!userId) { setLoading(false); return }
    ;(async () => {
      const [tagsRes, eventsRes] = await Promise.all([
        (supabase.from('tags') as any)
          .select('id, text, type, growth_point, seed_weight, stage, position_x, position_y')
          .eq('user_id', userId).eq('is_active', true),
        (supabase.from('tag_events') as any)
          .select('created_at').eq('user_id', userId),
      ])
      if (tagsRes.data) {
        setLightTags(tagsRes.data.filter((t: any) => t.type === 'light'))
        setShadowTags(tagsRes.data.filter((t: any) => t.type === 'shadow'))
      }
      if (eventsRes.data) {
        setEventCount(eventsRes.data.length)
        setConsecutiveDays(getConsecutiveDays(eventsRes.data.map((e: any) => e.created_at as string)))
      }
      setLoading(false)

      const visitedTagId = sessionStorage.getItem('onboarding_room_visited')
      if (visitedTagId) {
        sessionStorage.removeItem('onboarding_room_visited')
        setPendingOnboardingTagId(visitedTagId)
      }
    })()
  }, [])

  // ── Friend バブルフェッチ ──
  useEffect(() => {
    const userId = sessionStorage.getItem('user_id')
    if (!userId) return
    ;(async () => {
      // accepted な繋がりを取得
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
      if (friendIds.length === 0) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usersRes = await (supabase.from('users') as any)
        .select('id, username, avatar_url')
        .in('id', friendIds)

      const usersMap = new Map<string, { username: string; avatar_url: string | null }>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((usersRes.data ?? []) as any[]).map((u: any) => [u.id as string, u]),
      )

      // メッセージ数を friend ごとにカウント
      const msgCounts = new Map<string, number>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const msg of ((msgRes.data ?? []) as any[])) {
        const fid: string = msg.sender_id === userId ? msg.receiver_id : msg.sender_id
        msgCounts.set(fid, (msgCounts.get(fid) ?? 0) + 1)
      }

      const bubbles: FriendBubble[] = friendIds
        .filter(fid => usersMap.has(fid))
        .map(fid => {
          const u     = usersMap.get(fid)!
          const count = msgCounts.get(fid) ?? 0
          const level: 1 | 2 | 3 = count >= 30 ? 3 : count >= 10 ? 2 : 1
          return {
            id: fid,
            text: u.username ?? '?',
            username: u.username ?? '?',
            avatarUrl: u.avatar_url ?? null,
            msgCount: count,
            level,
          }
        })

      setFriendBubbles(bubbles)
    })()
  }, [])

  // ── tagsテーブルのリアルタイム購読（seed_weight/growth_point変化を即時反映） ──
  useEffect(() => {
    const userId = sessionStorage.getItem('user_id')
    if (!userId) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch = (supabase as any)
      .channel('garden-tags-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tags', filter: `user_id=eq.${userId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const updated = payload.new
          if (updated.type === 'shadow') {
            setShadowTags(prev => prev.map(t =>
              t.id === updated.id
                ? { ...t, seed_weight: String(updated.seed_weight ?? ''), stage: updated.stage ?? null }
                : t
            ))
          } else if (updated.type === 'light') {
            setLightTags(prev => prev.map(t =>
              t.id === updated.id ? { ...t, growth_point: updated.growth_point ?? 0 } : t
            ))
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [])

  // ── オンボーディング完了演出 ──
  useEffect(() => {
    if (!pendingOnboardingTagId) return
    setTab('shadow')
    setPan({ x: 0, y: 0 })
    const t1 = setTimeout(() => {
      setGrowingTagId(pendingOnboardingTagId)
      setShadowTags(prev => prev.map(t => t.id === pendingOnboardingTagId ? { ...t, stage: 'sprout' } : t))
      const userId = sessionStorage.getItem('user_id')
      if (userId) {
        ;(supabase.from('tags') as any)
          .update({ stage: 'sprout' })
          .eq('id', pendingOnboardingTagId)
          .eq('user_id', userId)
      }
      advanceStep('done')
    }, 300)
    const t2 = setTimeout(() => setToastVisible(true), 700)
    const t3 = setTimeout(() => { setToastVisible(false); setShowFinalAnimation(true) }, 3200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [pendingOnboardingTagId])

  // ── Seedバブル成長演出（onboarding_seed_visit） ──
  useEffect(() => {
    if (step !== 'onboarding_seed_visit') return
    const tagId = sessionStorage.getItem('onboarding_seed_tag_id')
    if (!tagId) return

    setTab('shadow')
    setPan({ x: 0, y: 0 })

    const t1 = setTimeout(() => setExpandedTagId(tagId), 300)
    const t2 = setTimeout(() => setShowGrowthPopup(true), 900)
    const t3 = setTimeout(() => {
      setShowGrowthPopup(false)
      sessionStorage.removeItem('onboarding_seed_tag_id')
      advanceStep('growth_explain')
    }, 3900)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // ── タブ切替でバブルフェードイン & pan リセット ──
  useEffect(() => {
    setVisible(false)
    setPan({ x: 0, y: 0 })
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [tab])

  const currentTags: AnyTag[] = tab === 'light' ? lightTags : tab === 'shadow' ? shadowTags : friendBubbles
  const totalTags = lightTags.length + shadowTags.length

  const bubbleSizes = useMemo(() => {
    if (tab === 'light')  return lightTags.map(t => getDaisySize(t.growth_point ?? 0))
    if (tab === 'shadow') return shadowTags.map(t => getSeedSize(t.seed_weight))
    return friendBubbles.map(f => FRIEND_LEVEL_SIZES[f.level])
  }, [tab, lightTags, shadowTags, friendBubbles])

  const positions = useMemo(() => {
    if (containerW === 0) return []
    return generatePositions(
      currentTags.length,
      containerW,
      bubbleSizes,
      currentTags.map(t => ({ x: t.position_x, y: t.position_y })),
    )
  }, [tab, containerW, bubbleSizes, currentTags])

  // 最も下のバブルの底辺 + 余白
  const canvasH = useMemo(() => {
    if (positions.length === 0) return 460
    const maxBottom = Math.max(...positions.map((p, i) => p.y + (bubbleSizes[i] ?? 52)))
    return maxBottom + 40
  }, [positions, bubbleSizes])

  // ── ドラッグハンドラ ──
  // setPointerCapture はドラッグ開始時にのみ呼ぶ。
  // pointerDown で即キャプチャすると pointerup がコンテナに届いてバブルの click が発火しなくなる。
  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = false
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (Math.hypot(dx, dy) >= 5) {
      if (!isDragging.current) {
        isDragging.current = true
        // ドラッグ確定時にキャプチャ → コンテナ外でも追従できる
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      }
      setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy })
    }
  }

  const onPointerUp = () => { dragRef.current = null }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80, color: 'rgba(59,47,30,0.4)', fontSize: 13 }}>
        読み込み中...
      </div>
    )
  }

  const activeBg   = tab === 'light' ? '#F5D78E' : tab === 'shadow' ? '#D4B896' : '#B8D4E8'
  const activeText = tab === 'light' ? '#7A5C00' : tab === 'shadow' ? '#6B4E1A' : '#2C5F7A'
  const legend     = tab === 'light' ? DAISY_LEGEND : tab === 'shadow' ? SEED_LEGEND : FRIEND_LEGEND

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>

      {/* ── ヘッダー ── */}
      <div style={{
        padding: '44px 20px 8px', flexShrink: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#3B2F1E', margin: '0 0 2px' }}>
            🌿 わたしのガーデン
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.45)', margin: 0 }}>
            タグをタップしてルームへ
          </p>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          aria-label="ヘルプ"
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#FFFFFF', border: '1px solid rgba(139,105,20,0.2)',
            cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#8B6914',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginTop: 4,
          }}
        >
          ？
        </button>
      </div>

      {/* ── ステータス行 ── */}
      <div style={{ display: 'flex', padding: '10px 20px 14px', flexShrink: 0 }}>
        {[
          { label: '向き合った回数', value: `${eventCount}回` },
          { label: 'タグ数',         value: `${totalTags}個` },
          { label: '連続日数',       value: `${consecutiveDays}日` },
        ].map(({ label, value }, i) => (
          <div key={label} style={{
            flex: 1, textAlign: 'center',
            borderLeft: i > 0 ? '1px solid rgba(59,47,30,0.1)' : 'none',
          }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#3B2F1E', margin: 0 }}>{value}</p>
            <p style={{ fontSize: 10, color: 'rgba(59,47,30,0.5)', margin: 0 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── タブ ── */}
      <div style={{ display: 'flex', padding: '0 20px', gap: 8, marginBottom: 12, flexShrink: 0 }}>
        {(['light', 'shadow', 'friend'] as TabType[]).map(t => {
          const tabBg   = t === 'light' ? '#F5D78E' : t === 'shadow' ? '#D4B896' : '#B8D4E8'
          const tabText = t === 'light' ? '#7A5C00' : t === 'shadow' ? '#6B4E1A' : '#2C5F7A'
          const tabLabel = t === 'light' ? '🌼 Daisy' : t === 'shadow' ? '🌱 Seed' : '🤝 Friend'
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
                background: tab === t ? tabBg : 'rgba(59,47,30,0.07)',
                color: tab === t ? tabText : 'rgba(59,47,30,0.4)',
                fontSize: 13, fontWeight: tab === t ? 700 : 500, cursor: 'pointer',
                transition: 'background 0.2s ease, color 0.2s ease',
              }}
            >
              {tabLabel}
            </button>
          )
        })}
      </div>

      {/* ── バブルエリア（ドラッグ可能） ── */}
      <div
        ref={el => { if (el) setContainerW(el.clientWidth) }}
        style={{
          flex: 1, position: 'relative',
          margin: '0 20px', overflow: 'visible',
          cursor: 'grab', touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* パン用キャンバス */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: containerW, height: canvasH,
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          willChange: 'transform',
        }}>
          {currentTags.length === 0 ? (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)', textAlign: 'center',
            }}>
              <p style={{ fontSize: 14, color: 'rgba(59,47,30,0.35)', margin: 0 }}>
                タグがありません
              </p>
            </div>
          ) : currentTags.map((tag, i) => {
            const isFriend   = tab === 'friend'
            const isGrowing  = !isFriend && growingTagId === tag.id
            const isExpanded = !isFriend && expandedTagId === tag.id
            const baseSize   = bubbleSizes[i] ?? 60
            const size       = isGrowing ? baseSize + 20 : baseSize
            const pos        = positions[i] ?? { x: 0, y: 0 }

            let bg: string
            let textColor: string

            if (isFriend) {
              const colors = FRIEND_LEVEL_COLORS[(tag as FriendBubble).level]
              bg = colors.bg; textColor = colors.text
            } else if (isGrowing) {
              bg = '#9DC08B'; textColor = '#2D5A27'
            } else if (tab === 'light') {
              bg = activeBg; textColor = activeText
            } else {
              const s = getSeedBubble((tag as ShadowTag).stage, (tag as ShadowTag).seed_weight)
              bg = s.bg; textColor = s.text
            }

            return (
              <button
                key={tag.id}
                onClick={() => {
                  if (isDragging.current) return
                  if (isFriend) {
                    router.push(`/room/friend/${tag.id}`)
                  } else {
                    setSelectedBubble({ tagId: tag.id, tagText: tag.text, tagType: tab as 'light' | 'shadow' })
                  }
                }}
                style={{
                  position: 'absolute',
                  left: pos.x, top: pos.y,
                  width: size, height: size,
                  borderRadius: '50%',
                  background: (tab === 'light' && !isGrowing) ? 'none' : bg,
                  border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 2,
                  overflow: 'hidden',
                  boxShadow: isGrowing || isExpanded
                    ? '0 0 20px rgba(74,124,89,0.55), 0 3px 10px rgba(0,0,0,0.1)'
                    : '0 3px 10px rgba(0,0,0,0.1)',
                  opacity: visible ? 1 : 0,
                  transform: isExpanded
                    ? 'scale(1.3)'
                    : visible ? 'scale(1)' : 'scale(0.75)',
                  transition: isGrowing
                    ? 'width 0.8s cubic-bezier(0.34,1.56,0.64,1), height 0.8s cubic-bezier(0.34,1.56,0.64,1), background 0.8s ease, box-shadow 0.8s ease'
                    : isExpanded
                    ? 'transform 0.5s ease, box-shadow 0.5s ease'
                    : `opacity 0.4s ease ${i * 0.12}s, transform 0.4s ease ${i * 0.12}s, width 0.5s ease, height 0.5s ease, background 0.5s ease`,
                  pointerEvents: 'auto',
                  userSelect: 'none',
                }}
              >
                {isFriend ? (() => {
                  const fb       = tag as FriendBubble
                  const avatarSz = Math.round(size * 0.45)
                  return (
                    <>
                      <div style={{
                        width: avatarSz, height: avatarSz, borderRadius: '50%',
                        overflow: 'hidden', flexShrink: 0,
                        background: 'rgba(255,255,255,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: Math.round(avatarSz * 0.5), fontWeight: 700,
                        color: textColor,
                      }}>
                        {fb.avatarUrl
                          ? <img src={fb.avatarUrl} alt={fb.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : fb.username[0]?.toUpperCase() ?? '?'
                        }
                      </div>
                      <span style={{
                        fontSize: clamp(Math.round(size * 0.13), 7, 10),
                        fontWeight: 600, color: textColor,
                        maxWidth: size - 8, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginTop: 2,
                      }}>
                        {fb.username}
                      </span>
                    </>
                  )
                })() : tab === 'light' && !isGrowing ? (
                  /* Daisy バブル: SVG が背景ごと描画、テキストを下部に重ねる */
                  <>
                    <DaisyBubble size={size} />
                    <span style={{
                      position: 'absolute',
                      bottom: Math.max(Math.round(size * 0.1), 4),
                      left: 0, right: 0, textAlign: 'center',
                      fontSize: clamp(Math.round(size * 0.13), 7, 11),
                      fontWeight: 700, color: '#5A3800',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      paddingLeft: 6, paddingRight: 6,
                    }}>
                      #{tag.text.replace(/^#+/, '')}
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: clamp(Math.round(size * 0.28), 16, 28) }}>
                      {isGrowing ? '🌿'
                        : getSeedBubble((tag as ShadowTag).stage, (tag as ShadowTag).seed_weight).emoji
                      }
                    </span>
                    <span style={{
                      fontSize: clamp(Math.round(size * 0.14), 8, 11),
                      fontWeight: 600, color: textColor,
                      maxWidth: size - 10, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      #{tag.text.replace(/^#+/, '')}
                    </span>
                  </>
                )}
              </button>
            )
          })}

          {/* ── Seedバブル成長ポップアップ ── */}
          {(() => {
            if (!showGrowthPopup || !expandedTagId || tab !== 'shadow') return null
            const idx  = shadowTags.findIndex(t => t.id === expandedTagId)
            if (idx < 0) return null
            const pos  = positions[idx] ?? { x: 0, y: 0 }
            const size = bubbleSizes[idx] ?? 60
            return (
              <BubbleGrowthPopup
                cx={pos.x + size / 2}
                cy={pos.y}
              />
            )
          })()}
        </div>
      </div>

      {/* ── 凡例 ── */}
      <div style={{ padding: '10px 20px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {legend.map(({ emoji, label }) => (
            <span key={label} style={{ fontSize: 11, color: 'rgba(59,47,30,0.5)' }}>
              {emoji} {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── バブル詳細モーダル ── */}
      {selectedBubble && (
        <BubbleDetailModal
          tagId={selectedBubble.tagId}
          tagText={selectedBubble.tagText}
          tagType={selectedBubble.tagType}
          onClose={() => {
            setSelectedBubble(null)
            if (step === 'done') setShowCompleteAnimation(true)
          }}
        />
      )}

      {/* ── 成長の仕組み説明モーダル ── */}
      {step === 'growth_explain' && (
        <GrowthExplainModal
          onClose={() => {}}
          onOpenBubble={() => {
            if (!expandedTagId) return
            const tag = shadowTags.find(t => t.id === expandedTagId)
            if (!tag) return
            setSelectedBubble({ tagId: tag.id, tagText: tag.text, tagType: 'shadow' })
          }}
          onOpenHelp={() => setShowHelp(true)}
        />
      )}

      {/* ── オンボーディング完了アニメーション ── */}
      {showCompleteAnimation && (
        <GrowthModal
          onComplete={() => {
            advanceStep('completed')
            sessionStorage.removeItem('onboarding_seed_tag_id')
            setShowCompleteAnimation(false)
          }}
        />
      )}

      {/* ── 最終アニメーション ── */}
      {showFinalAnimation && (
        <GrowthTransitionOverlay
          stage="bloom"
          message={{ title: 'つながれた。🌿', subtitle: 'あなたのままで、ここにいていい。' }}
          buttonText="次へ"
          onNext={() => { setShowFinalAnimation(false); setShowThankYou(true) }}
        />
      )}

      {/* ── 協力ありがとう ── */}
      {showThankYou && (
        <ThankYouModal onClose={() => setShowThankYou(false)} />
      )}

      {/* ── ヘルプモーダル ── */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* ── オンボーディング完了トースト ── */}
      {toastVisible && (
        <div style={{
          position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
          zIndex: 500,
          background: '#4A7C59', color: '#FFFFFF',
          padding: '12px 24px', borderRadius: 30,
          fontSize: 14, fontWeight: 700,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          whiteSpace: 'nowrap',
          animation: 'toast-in 0.3s ease both',
        }}>
          🌿 向き合えた！タネが芽吹いた
        </div>
      )}
    </div>
  )
}
