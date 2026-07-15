'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import BubbleDetailModal from '@/src/components/BubbleDetailModal'
import TagWordsModal from '@/src/components/TagWordsModal'
import HelpModal from '@/src/components/HelpModal'
import DaisyBubble from '@/src/components/DaisyBubble'
import AppLogo from '@/src/components/AppLogo'
import { ProfileDrawer } from '@/src/components/ProfileDrawer'
import FriendBubble from '@/src/components/FriendBubble'

type LightTag  = { id: string; text: string; growth_point: number; color?: string | null; position_x?: number | null; position_y?: number | null }
type ShadowTag = { id: string; text: string; growth_point: number; color?: string | null; seed_weight: string | null; stage: string | null; position_x?: number | null; position_y?: number | null }
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

const MIN_BUBBLE_SIZE     = 48
const MAX_BUBBLE_SIZE     = 108
const DEFAULT_BUBBLE_SIZE = 62

function clamp(v: number, min: number, max: number) { return Math.min(Math.max(v, min), max) }

// growth_point の分布を 0〜1 に正規化し、MIN〜MAX に線形マッピングする。
// 全タグが同じ値（または全0）の場合はデフォルトサイズを返す。
// 「高い growth_point = 大きいバブル = generatePositions でより中心に配置」
// という連鎖が成立する。
function relativeSizes(growthPoints: number[]): number[] {
  if (growthPoints.length === 0) return []
  const min = Math.min(...growthPoints)
  const max = Math.max(...growthPoints)
  if (max === min) return growthPoints.map(() => DEFAULT_BUBBLE_SIZE)
  return growthPoints.map(gp => {
    const t = clamp((gp - min) / (max - min), 0, 1)
    return Math.round(MIN_BUBBLE_SIZE + t * (MAX_BUBBLE_SIZE - MIN_BUBBLE_SIZE))
  })
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

// 連続日数に応じて🔥の大きさを4段階で変える。0日は表示しない（null）。
function getStreakFireSize(days: number): number | null {
  if (days <= 0) return null
  if (days < 7) return 12
  if (days < 14) return 17
  if (days < 30) return 22
  return 28
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
// バブルの上にハッシュタグラベルを出すため、ラベル高さ分の余白を上端に確保する
const BUBBLE_TOP_OFFSET = 46

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
  // 係数2.3はフォールバック不要な余裕を確保するための実測調整値。
  const needsGenArea = needsGen.reduce((sum, idx) => {
    const r = (sizes[idx] ?? 52) / 2
    return sum + Math.PI * r * r
  }, 0)
  const AREA_FACTOR = 2.3
  const yCap = Math.max(300, topOffset + (needsGenArea * AREA_FACTOR) / w)

  // 配置エリアの中心（大きいバブルをここに最優先で寄せる）
  const cx0 = w / 2
  const cy0 = topOffset + (yCap - topOffset) / 2

  const inBounds = (cx: number, cy: number, r: number): boolean =>
    cx - r >= 10 && cx + r <= w - 10 &&
    cy - r >= topOffset + 10 && cy + r <= yCap - 10

  // 中心から配置エリアの隅までの最大距離（リングサーチの探索上限）
  const maxRadius = Math.hypot(w / 2, (yCap - topOffset) / 2) + 20
  const RADIAL_STEP = 2 // リングの半径方向の刻み(px)：3→2で空き地発見率を上げる
  const ARC_RES = 4     // 各リング上での弧の刻み(px)

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

  // ランダムリング配置フォールバック：シェルフ（行揃え）を廃止し、
  // yCap下をランダム角度のリング走査で配置することでグリッド状整列を防ぐ。
  let fallbackCount = 0

  const findFallbackSpot = (r: number): { cx: number; cy: number } => {
    const bottomMost = placed.length > 0 ? Math.max(...placed.map(p => p.cy + p.r)) : yCap
    const fbCy = Math.max(yCap, bottomMost) + r + GAP
    const startAngle = Math.random() * 2 * Math.PI
    for (let ring = 0; ring < 800; ring += 2) {
      const n = ring === 0 ? 1 : Math.max(8, Math.ceil((2 * Math.PI * ring) / ARC_RES))
      for (let s = 0; s < n; s++) {
        const angle = ring === 0 ? 0 : startAngle + (2 * Math.PI * s) / n
        const cx = ring === 0 ? cx0 : cx0 + ring * Math.cos(angle)
        const cy = ring === 0 ? fbCy : fbCy + ring * Math.sin(angle)
        if (cx - r >= 5 && cx + r <= w - 5 && noOverlap(cx, cy, r)) {
          return { cx, cy }
        }
      }
    }
    return { cx: cx0, cy: fbCy }
  }

  for (const idx of order) {
    const r = (sizes[idx] ?? 52) / 2
    let spot = findNearestFreeSpot(r)

    if (!spot) {
      fallbackCount++
      spot = findFallbackSpot(r)
    }

    placed.push({ cx: spot.cx, cy: spot.cy, r })
    result[idx] = { x: spot.cx - r, y: spot.cy - r }
  }

  if (fallbackCount > 0) {
    console.log(`[generatePositions] needsGen=${needsGen.length} fallback=${fallbackCount} yCap=${yCap.toFixed(0)}`)
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
  { emoji: '💬', label: 'メッセージが多いほど中心・大きく' },
]

// canvasH は positions から動的に算出するため定数不要

// embedded: ProfileDrawer 内に埋め込むモード。タイトル行（プロフィール・ヘルプボタン）と
// 内部の ProfileDrawer を描画しない（ProfileDrawer → GardenDisplay → ProfileDrawer の
// 無限再帰を防ぐため必須）。統計・タブ・バブル表示はそのまま。
export default function GardenDisplay({ embedded = false }: { embedded?: boolean } = {}) {
  const router = useRouter()

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [tab, setTab]                   = useState<TabType>('light')
  const [lightTags, setLightTags]       = useState<LightTag[]>([])
  const [shadowTags, setShadowTags]     = useState<ShadowTag[]>([])
  const [consecutiveDays, setConsecutiveDays] = useState(0)
  const [loading, setLoading]           = useState(true)
  const [visible, setVisible]           = useState(false)
  const [containerW, setContainerW]     = useState(330)
  const [pan, setPan]                   = useState({ x: 0, y: 0 })

  const [selectedBubble, setSelectedBubble] = useState<{ tagId: string; tagText: string; tagType: 'light' | 'shadow'; tagColor: string | null } | null>(null)

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
    const userId = localStorage.getItem('user_id')
    if (!userId) { setLoading(false); return }
    ;(async () => {
      const [tagsRes, eventsRes] = await Promise.all([
        (supabase.from('tags') as any)
          .select('id, text, type, growth_point, color, seed_weight, stage, position_x, position_y')
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
        setConsecutiveDays(getConsecutiveDays(eventsRes.data.map((e: any) => e.created_at as string)))
      }
      setLoading(false)
    })()
  }, [])


  // ── tagsテーブルのリアルタイム購読（seed_weight/growth_point変化を即時反映） ──
  useEffect(() => {
    const userId = localStorage.getItem('user_id')
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

  const currentTags: AnyTag[] = tab === 'light' ? lightTags : tab === 'shadow' ? shadowTags : []
  const totalTags = lightTags.length + shadowTags.length
  const streakFireSize = getStreakFireSize(consecutiveDays)

  const bubbleSizes = useMemo(() => {
    if (tab === 'light')  return relativeSizes(lightTags.map(t => t.growth_point ?? 0))
    if (tab === 'shadow') return relativeSizes(shadowTags.map(t => t.growth_point ?? 0))
    return []
  }, [tab, lightTags, shadowTags])

  // ラベル（バブル上のハッシュタグ）が隣のバブルと重ならないよう、
  // 当たり判定はラベル込みの大きさで見積もる（描画はバブル本体のサイズのまま）。
  // labelW: ラベルピルの概算幅（全角約11px/字＋左右余白）、+26: 上のラベル帯の高さ。
  const collisionSizes = useMemo(
    () => currentTags.map((t, i) => {
      const bs = bubbleSizes[i] ?? DEFAULT_BUBBLE_SIZE
      const labelW = t.text.replace(/^#+/, '').length * 11 + 22
      return Math.max(labelW, bs + 26)
    }),
    [currentTags, bubbleSizes],
  )

  const { positions, changedIndices } = useMemo(() => {
    if (containerW === 0) return { positions: [], changedIndices: [] }
    return generatePositions(
      currentTags.length,
      containerW,
      collisionSizes,
      currentTags.map(t => ({ x: t.position_x, y: t.position_y })),
      BUBBLE_TOP_OFFSET,
    )
  }, [tab, containerW, collisionSizes, currentTags])

  // 衝突解消で座標が変わった（≒保存値と異なる）タグはDBへ書き戻す。
  // 次回読み込み時にも同じ重ならない配置がそのまま再現されるようにする。
  // Friendバブルは tags テーブルの行を持たないため対象外。
  useEffect(() => {
    if (tab === 'friend' || changedIndices.length === 0) return
    const userId = localStorage.getItem('user_id')
    if (!userId) return
    for (const i of changedIndices) {
      const tag = currentTags[i]
      const pos = positions[i]
      if (!tag || !pos) continue
      const r = (collisionSizes[i] ?? 52) / 2
      // result は左上座標なので、DB保存用の中心座標に変換し直す
      ;(supabase.from('tags') as any)
        .update({ position_x: pos.x + r, position_y: pos.y + r })
        .eq('id', tag.id)
        .eq('user_id', userId)
    }
  }, [changedIndices, positions, currentTags, collisionSizes, tab])

  // 最も下のバブルの底辺 + 余白
  const canvasH = useMemo(() => {
    if (positions.length === 0) return 460
    const maxBottom = Math.max(...positions.map((p, i) => p.y + (collisionSizes[i] ?? 52)))
    return maxBottom + 40
  }, [positions, collisionSizes])

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
        {/* ── タイトル行（ロゴ中心・埋め込み時は非表示） ── */}
        {!embedded && (
        <div style={{
          padding: '16px 20px 8px', flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {/* プロフィールボタン（ヘルプボタンと同幅でロゴを中央に保つ） */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            aria-label="プロフィール"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#FFFFFF', border: '1px solid rgba(139,105,20,0.2)',
              cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            👤
          </button>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <AppLogo size="sm" />
          </div>
          <button
            onClick={() => setShowHelp(true)}
            aria-label="ヘルプ"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#FFFFFF', border: '1px solid rgba(139,105,20,0.2)',
              cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#8B6914',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ？
          </button>
        </div>
        )}

        {/* ── ステータス行 ── */}
        <div style={{ display: 'flex', padding: '10px 20px 14px', flexShrink: 0 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#3B2F1E', margin: 0 }}>{totalTags}個</p>
            <p style={{ fontSize: 10, color: 'rgba(59,47,30,0.5)', margin: 0 }}>タグ数</p>
          </div>
          <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(59,47,30,0.1)' }}>
            <p style={{
              fontSize: 18, fontWeight: 700, color: '#3B2F1E', margin: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              {streakFireSize !== null && (
                <span style={{ fontSize: streakFireSize, lineHeight: 1 }}>🔥</span>
              )}
              {consecutiveDays}日
            </p>
            <p style={{ fontSize: 10, color: 'rgba(59,47,30,0.5)', margin: 0 }}>連続日数</p>
          </div>
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

      {/* ── バブルエリア ── */}
      {tab === 'friend' ? (
        <div style={{ flex: 1, margin: '0 20px', overflow: 'hidden' }}>
          <FriendBubble />
        </div>
      ) : (
      /* ── Daisy / Seed キャンバス（ドラッグ可能） ── */
      /* ヘッダーラッパー（zIndex:50）より確実に背面（zIndex:0）に固定する。
         個々のバブル要素は明示的なzIndexを持たない（DOM順のautoスタッキングのみ）ため、
         このコンテナのzIndexがそのままバブル全体の階層を決める。 */
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
            const isPulsing  = pulseTagIds.has(tag.id)
            const size       = bubbleSizes[i] ?? 60
            const cSize      = collisionSizes[i] ?? size
            const pos        = positions[i] ?? { x: 0, y: 0 }
            // 当たり判定（collision）中心にバブル本体を合わせ、ラベルはその上に置く
            const cR         = cSize / 2
            const centerX    = pos.x + cR
            const centerY    = pos.y + cR
            const leftX      = centerX - size / 2
            const topY       = centerY - size / 2

            const bg = tab === 'light'
              ? activeBg
              : getSeedBubble((tag as ShadowTag).stage, (tag as ShadowTag).seed_weight).bg
            const clean = tag.text.replace(/^#+/, '')

            return (
              <Fragment key={tag.id}>
                {/* ハッシュタグラベル（バブルの上・チャット画面と同じ配色） */}
                <span style={{
                  position: 'absolute',
                  left: centerX, top: topY - 6,
                  transform: 'translate(-50%, -100%)',
                  fontSize: 11, fontWeight: 700,
                  color: '#8B6914', background: '#F5D78E',
                  borderRadius: 999, padding: '2px 9px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  pointerEvents: 'none', zIndex: 5,
                  opacity: visible ? 1 : 0,
                  transition: `opacity 0.4s ease ${i * 0.12}s`,
                }}>
                  #{clean}
                </span>

                <button
                  onClick={() => {
                    if (isDragging.current) return
                    setSelectedBubble({
                      tagId: tag.id, tagText: tag.text,
                      tagType: tab as 'light' | 'shadow',
                      tagColor: (tag as LightTag | ShadowTag).color ?? null,
                    })
                  }}
                  style={{
                    position: 'absolute',
                    left: leftX, top: topY,
                    width: size, height: size,
                    minWidth: size, minHeight: size,
                    borderRadius: '50%',
                    background: tab === 'light' ? 'none' : bg,
                    border: 'none', cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                  {tab === 'light' ? (
                    <DaisyBubble size={size} centered />
                  ) : (
                    <span style={{ fontSize: clamp(Math.round(size * 0.42), 20, 44), lineHeight: 1 }}>
                      {getSeedBubble((tag as ShadowTag).stage, (tag as ShadowTag).seed_weight).emoji}
                    </span>
                  )}
                </button>
              </Fragment>
            )
          })}
        </div>
      </div>
      )}

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
      {/* 埋め込み（プロフィール内）ではタグの言葉・日記一覧のシート、
          通常のガーデン画面では従来のフルスクリーン詳細（成長表示・日記書き込み付き） */}
      {selectedBubble && (
        embedded ? (
          <TagWordsModal
            tagId={selectedBubble.tagId}
            tagText={selectedBubble.tagText}
            tagColor={selectedBubble.tagColor}
            onClose={() => setSelectedBubble(null)}
          />
        ) : (
          <BubbleDetailModal
            tagId={selectedBubble.tagId}
            tagText={selectedBubble.tagText}
            tagType={selectedBubble.tagType}
            onClose={() => setSelectedBubble(null)}
          />
        )
      )}

      {/* ── ヘルプモーダル ── */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* ── プロフィールドロワー（埋め込み時は描画しない：無限再帰防止） ── */}
      {!embedded && <ProfileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />}
    </div>
  )
}
