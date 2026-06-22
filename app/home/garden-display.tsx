'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import BubbleDetailModal from '@/src/components/BubbleDetailModal'
import HelpModal from '@/src/components/HelpModal'
import DaisyBubble from '@/src/components/DaisyBubble'

type LightTag  = { id: string; text: string; growth_point: number; position_x?: number | null; position_y?: number | null }
type ShadowTag = { id: string; text: string; growth_point: number; seed_weight: string | null; stage: string | null; position_x?: number | null; position_y?: number | null }
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

const BASE_SEED_SIZE  = 68
const BASE_DAISY_SIZE = 52
const MAX_BUBBLE_SIZE = 100
// 通常タグの満開ライン（growthPoint.ts の LIGHT_THRESHOLDS 最大値）に合わせて
// この点数でバブルが最大サイズに達するようにする
const POINT_SIZE_CAP = 30

function clamp(v: number, min: number, max: number) { return Math.min(Math.max(v, min), max) }

// growth_point に応じてバブルサイズを base〜MAX_BUBBLE_SIZE の範囲で滑らかに大きくする。
// ルームを訪れる（ポイントが入る）たびに少しずつ膨らんでいく。
function sizeFromPoints(growthPoint: number, base: number): number {
  const ratio = clamp(growthPoint, 0, POINT_SIZE_CAP) / POINT_SIZE_CAP
  return Math.round(base + (MAX_BUBBLE_SIZE - base) * ratio)
}

function getSeedSize(growthPoint: number): number {
  return sizeFromPoints(growthPoint, BASE_SEED_SIZE)
}

function getDaisySize(growthPoint: number): number {
  return sizeFromPoints(growthPoint, BASE_DAISY_SIZE)
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

// position_x / position_y は「バブル中心座標」(cx, cy) として保存・解釈する。
// GardenSetupFlow.savePositions が書き込む値と意味を統一している。
// generatePositions の戻り値 positions[].x/.y は CSS left/top 用の「左上座標」なので、
// 中心 → 左上の変換は必ず (cx - r, cy - r) で行うこと。
type StoredPos = { x?: number | null; y?: number | null }

// バブル配置エリアの上端マージン。タブ行とバブルエリアの間は元々marginBottom:12pxしか
// 無く、バブルのboxShadow(最大10pxにじみ)と合わさってタブに重なって見えるため確保する。
// ※ バブルエリア自体は既にタブの下（通常のflowの後続要素）に配置されているので、
//   ヘッダー全体の高さを足す必要はなく、エリア内の小さな安全マージンで十分。
const BUBBLE_TOP_OFFSET = 24

// ── 配置アルゴリズム ──
// 重なりを最優先で排除しつつ、隙間なく密着させ、サイズが大きいバブルほど
// 中央寄りになるようにする（同心円状の「空き地サーチ」による円充填）。
// 1. 保存済み座標(中心)を元の順序で検証 → 既存同士で重ならず、上端マージンも
//    侵していないものだけ確定採用（ユーザーが手動でドラッグした位置を無駄に動かさないため）
// 2. 重なっていた/上端マージンに食い込んでいた/未保存のものは「未検査」として再生成対象に回す
// 3. 再生成対象は直径の大きい順に処理し、配置エリアの中心から外側へリング状に
//    候補点を走査して、最初に見つかった非重複地点（＝中心に最も近い空き）に置く
//    （gap=2px、ほぼ密着）。大きいバブルが先に中心の最良地点を確保するため、
//    自然と「大きいほど中央・小さいほど外側」になる。
// 4. 配置エリア内に空きが見つからない極端なケースのみ、既存バブルの最下部に
//    積み上げるフォールバック（gap=2px、必ず非重複）
// changedIndices には「保存値と異なる座標になった（≒DBに書き戻すべき）」インデックスを返す
function generatePositions(
  count: number,
  w: number,
  sizes: number[],
  storedPos?: StoredPos[],
  topOffset: number = BUBBLE_TOP_OFFSET,
): { positions: Array<{ x: number; y: number }>; changedIndices: number[] } {
  if (count === 0) return { positions: [], changedIndices: [] }

  // ほぼ密着させるための最小ギャップ（0だとアンチエイリアスや影で接触に見えづらいため2px確保）
  const GAP = 2
  const result: Array<{ x: number; y: number }> = Array.from({ length: count }, () => ({ x: 0, y: 0 }))
  const placed: Array<{ cx: number; cy: number; r: number }> = []
  const needsGen: number[] = []

  const noOverlap = (cx: number, cy: number, r: number): boolean =>
    placed.every(p => Math.hypot(cx - p.cx, cy - p.cy) >= r + p.r + GAP)

  // Phase 0: 保存済み座標(中心)を元の順序で検証。
  // すでに確定済みの placed と重ならず、上端マージンも侵していない場合のみ確定採用し、
  // それ以外は未検査として needsGen（再生成対象）に積む。
  for (let i = 0; i < count; i++) {
    const sp = storedPos?.[i]
    const r  = (sizes[i] ?? 52) / 2
    if (
      sp && sp.x != null && sp.x !== 0 && sp.y != null && sp.y !== 0 &&
      noOverlap(sp.x, sp.y, r) && sp.y - r >= topOffset
    ) {
      result[i] = { x: sp.x - r, y: sp.y - r }
      placed.push({ cx: sp.x, cy: sp.y, r })
    } else {
      needsGen.push(i)
    }
  }
  if (needsGen.length === 0) return { positions: result, changedIndices: [] }

  // 直径の大きい順に処理（先に確保したバブルほど中心の最良地点を取れる）
  const order = [...needsGen].sort((a, b) => (sizes[b] ?? 0) - (sizes[a] ?? 0))

  // 配置エリアのY方向の上限は、未配置バブルの総面積から動的に算出する。
  // 「総面積 × 余裕係数 ÷ 幅」で必要分だけ確保する（最小300pxは保証）。
  // 余裕係数1.7は実測調整値：これより小さいとリングサーチが配置エリア内で
  // 空きを見つけられず最下部フォールバックに落ちる頻度が増え、密着配置が崩れる。
  const needsGenArea = needsGen.reduce((sum, idx) => {
    const r = (sizes[idx] ?? 52) / 2
    return sum + Math.PI * r * r
  }, 0)
  const AREA_FACTOR = 1.7
  const yCap = Math.max(300, topOffset + (needsGenArea * AREA_FACTOR) / w)

  // 配置エリアの中心（大きいバブルをここに最優先で寄せる）
  const cx0 = w / 2
  const cy0 = topOffset + (yCap - topOffset) / 2

  const inBounds = (cx: number, cy: number, r: number): boolean =>
    cx - r >= 10 && cx + r <= w - 10 &&
    cy - r >= topOffset + 10 && cy + r <= yCap - 10

  // 中心から配置エリアの隅までの最大距離（リングサーチの探索上限）
  const maxRadius = Math.hypot(w / 2, (yCap - topOffset) / 2) + 20
  const RADIAL_STEP = 3 // リングの半径方向の刻み(px)：小さいほど密着できるが探索コストが増える
  const ARC_RES = 4     // 各リング上での弧の刻み(px)：小さいほど精度が上がるが探索コストが増える

  // 中心(cx0, cy0)から外側へリング状に候補点を走査し、最初に見つかった
  // 非重複・範囲内の地点を返す（＝中心に最も近い空き地）
  const findNearestFreeSpot = (r: number): { cx: number; cy: number } | null => {
    if (inBounds(cx0, cy0, r) && noOverlap(cx0, cy0, r)) return { cx: cx0, cy: cy0 }
    for (let radius = RADIAL_STEP; radius <= maxRadius; radius += RADIAL_STEP) {
      const numSamples = Math.max(8, Math.min(360, Math.ceil((2 * Math.PI * radius) / ARC_RES)))
      for (let s = 0; s < numSamples; s++) {
        const angle = (2 * Math.PI * s) / numSamples
        const tx = cx0 + radius * Math.cos(angle)
        const ty = cy0 + radius * Math.sin(angle)
        if (inBounds(tx, ty, r) && noOverlap(tx, ty, r)) return { cx: tx, cy: ty }
      }
    }
    return null
  }

  // シェルフ（行）パッキング・フォールバック：配置エリア内に空きが見つからない
  // 極端なケースのみ、左→右に詰めて入らなくなったら次の行へ折り返す。
  // 最初の行のベースラインは必ず yCap 以上にする（cx=w/2 固定で詰んでいくと
  // 縦一列に並ぶ不具合があったため修正）。yCap はリングサーチが届く範囲
  // （cy+r <= yCap-10）の上限でもあるため、これより下から開始すれば、処理順が
  // 後になるリングサーチ済みバブルと時系列的に衝突することも構造的に無くなる。
  let shelfActive = false
  let shelfY = 0
  let shelfNextX = 0
  let shelfRowMaxR = 0
  let fallbackCount = 0

  const startNewShelfRow = (r: number, baseline: number) => {
    shelfY = baseline + r + GAP + 10
    shelfNextX = 10
    shelfRowMaxR = r
  }

  for (const idx of order) {
    const r = (sizes[idx] ?? 52) / 2
    let spot = findNearestFreeSpot(r)

    if (!spot) {
      fallbackCount++
      if (!shelfActive) {
        const placedBottomMax = placed.length > 0 ? Math.max(...placed.map(p => p.cy + p.r)) : topOffset
        startNewShelfRow(r, Math.max(yCap, placedBottomMax))
        shelfActive = true
      } else if (shelfNextX + r * 2 > w - 10) {
        startNewShelfRow(r, shelfY + shelfRowMaxR)
      }
      const cx = shelfNextX + r
      spot = { cx, cy: shelfY }
      shelfRowMaxR = Math.max(shelfRowMaxR, r)
      shelfNextX += r * 2 + GAP
    }

    placed.push({ cx: spot.cx, cy: spot.cy, r })
    result[idx] = { x: spot.cx - r, y: spot.cy - r }
  }

  if (fallbackCount > 0) {
    console.log(`[generatePositions] needsGen=${needsGen.length} fallback(shelf)=${fallbackCount} yCap=${yCap.toFixed(0)}`)
  }

  return { positions: result, changedIndices: needsGen }
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

  const [pulseTagIds, setPulseTagIds]               = useState<Set<string>>(new Set())
  const [showHelp, setShowHelp]                             = useState(false)

  // ドラッグ用 ref
  const dragRef    = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const isDragging = useRef(false)

  // ポイントで育って一回り大きくなったバブルに「膨らみ」アニメーションを付ける
  const pulseTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const triggerGrowthPulse = (tagId: string) => {
    setPulseTagIds(prev => new Set(prev).add(tagId))
    const existing = pulseTimers.current.get(tagId)
    if (existing) clearTimeout(existing)
    pulseTimers.current.set(tagId, setTimeout(() => {
      setPulseTagIds(prev => {
        if (!prev.has(tagId)) return prev
        const next = new Set(prev)
        next.delete(tagId)
        return next
      })
      pulseTimers.current.delete(tagId)
    }, 700))
  }
  useEffect(() => {
    return () => { pulseTimers.current.forEach(t => clearTimeout(t)) }
  }, [])

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
        const newLight  = tagsRes.data.filter((t: any) => t.type === 'light')
        const newShadow = tagsRes.data.filter((t: any) => t.type === 'shadow')
        setLightTags(newLight)
        setShadowTags(newShadow)

        // 前回ガーデンを見た時より育っているバブルには「膨らみ」アニメーションを付ける
        // （初回訪問時は比較対象がないので発火させず、基準値の記録のみ行う）
        for (const t of [...newLight, ...newShadow] as { id: string; growth_point: number }[]) {
          const seenKey = `bubble_seen_gp_${t.id}`
          const seenGp  = Number(sessionStorage.getItem(seenKey) ?? 'NaN')
          const curGp   = t.growth_point ?? 0
          if (!isNaN(seenGp) && curGp > seenGp) {
            setTimeout(() => triggerGrowthPulse(t.id), 500)
          }
          sessionStorage.setItem(seenKey, String(curGp))
        }
      }
      if (eventsRes.data) {
        setEventCount(eventsRes.data.length)
        setConsecutiveDays(getConsecutiveDays(eventsRes.data.map((e: any) => e.created_at as string)))
      }
      setLoading(false)
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
            setShadowTags(prev => prev.map(t => {
              if (t.id !== updated.id) return t
              const newGp = updated.growth_point ?? 0
              if (newGp > (t.growth_point ?? 0)) triggerGrowthPulse(t.id)
              return { ...t, growth_point: newGp, seed_weight: String(updated.seed_weight ?? ''), stage: updated.stage ?? null }
            }))
          } else if (updated.type === 'light') {
            setLightTags(prev => prev.map(t => {
              if (t.id !== updated.id) return t
              const newGp = updated.growth_point ?? 0
              if (newGp > (t.growth_point ?? 0)) triggerGrowthPulse(t.id)
              return { ...t, growth_point: newGp }
            }))
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [])

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
    if (tab === 'shadow') return shadowTags.map(t => getSeedSize(t.growth_point ?? 0))
    return friendBubbles.map(f => FRIEND_LEVEL_SIZES[f.level])
  }, [tab, lightTags, shadowTags, friendBubbles])

  const { positions, changedIndices } = useMemo(() => {
    if (containerW === 0) return { positions: [], changedIndices: [] }
    return generatePositions(
      currentTags.length,
      containerW,
      bubbleSizes,
      currentTags.map(t => ({ x: t.position_x, y: t.position_y })),
      BUBBLE_TOP_OFFSET,
    )
  }, [tab, containerW, bubbleSizes, currentTags])

  // 衝突解消で座標が変わった（≒保存値と異なる）タグはDBへ書き戻す。
  // 次回読み込み時にも同じ重ならない配置がそのまま再現されるようにする。
  // Friendバブルは tags テーブルの行を持たないため対象外。
  useEffect(() => {
    if (tab === 'friend' || changedIndices.length === 0) return
    const userId = sessionStorage.getItem('user_id')
    if (!userId) return
    for (const i of changedIndices) {
      const tag = currentTags[i]
      const pos = positions[i]
      if (!tag || !pos) continue
      const r = (bubbleSizes[i] ?? 52) / 2
      // result は左上座標なので、DB保存用の中心座標に変換し直す
      ;(supabase.from('tags') as any)
        .update({ position_x: pos.x + r, position_y: pos.y + r })
        .eq('id', tag.id)
        .eq('user_id', userId)
    }
  }, [changedIndices, positions, currentTags, bubbleSizes, tab])

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
      <style>{`@keyframes bubble-pulse { 0% { transform: scale(1); } 45% { transform: scale(1.25); } 75% { transform: scale(0.95); } 100% { transform: scale(1); } }`}</style>

      {/* ── ヘッダー（タイトル・統計・タブをまとめて最前面に固定） ── */}
      {/* バブル側の座標計算が多少ズレてもヘッダーに重ならないよう、座標ではなく
          スタッキング自体で確実に分離する。z-indexはスタッキングコンテキストの
          兄弟間でのみ比較されるため、このラッパーとバブルエリアは同じ親(この
          コンポーネントのルート)の直下の兄弟である必要がある。背景色がないと
          最前面でもバブルが透けて見えるため、ページ背景色を明示的に敷く。 */}
      <div style={{ position: 'relative', zIndex: 50, background: '#F5F0E8', flexShrink: 0 }}>
        {/* ── タイトル行 ── */}
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
      </div>

      {/* ── バブルエリア（ドラッグ可能） ── */}
      {/* ヘッダーラッパー（zIndex:50）より確実に背面（zIndex:0）に固定する。
          個々のバブル要素は明示的なzIndexを持たない（DOM順のautoスタッキングのみ）ため、
          このコンテナのzIndexがそのままバブル全体の階層を決める。 */}
      <div
        ref={el => { if (el) setContainerW(el.clientWidth) }}
        style={{
          flex: 1, position: 'relative', zIndex: 0,
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
            const isPulsing  = !isFriend && pulseTagIds.has(tag.id)
            const baseSize   = bubbleSizes[i] ?? 60
            const size       = baseSize
            const pos        = positions[i] ?? { x: 0, y: 0 }

            let bg: string
            let textColor: string

            if (isFriend) {
              const colors = FRIEND_LEVEL_COLORS[(tag as FriendBubble).level]
              bg = colors.bg; textColor = colors.text
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
                    router.push(`/room/friend/chat?friendId=${tag.id}`)
                  } else {
                    setSelectedBubble({ tagId: tag.id, tagText: tag.text, tagType: tab as 'light' | 'shadow' })
                  }
                }}
                style={{
                  position: 'absolute',
                  left: pos.x, top: pos.y,
                  width: size, height: size,
                  minWidth: size, minHeight: size,
                  borderRadius: '50%',
                  background: tab === 'light' ? 'none' : bg,
                  border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 2,
                  overflow: 'hidden',
                  boxShadow: isPulsing
                    ? '0 0 20px rgba(74,124,89,0.55), 0 3px 10px rgba(0,0,0,0.1)'
                    : '0 3px 10px rgba(0,0,0,0.1)',
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'scale(1)' : 'scale(0.75)',
                  animation: isPulsing ? 'bubble-pulse 0.7s cubic-bezier(0.34,1.56,0.64,1)' : undefined,
                  transition: `opacity 0.4s ease ${i * 0.12}s, transform 0.4s ease ${i * 0.12}s, width 0.5s ease, height 0.5s ease, background 0.5s ease`,
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
                })() : tab === 'light' ? (
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
                      {getSeedBubble((tag as ShadowTag).stage, (tag as ShadowTag).seed_weight).emoji}
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
          onClose={() => setSelectedBubble(null)}
        />
      )}

      {/* ── ヘルプモーダル ── */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}
