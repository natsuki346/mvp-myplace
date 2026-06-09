'use client'

import { useState, useRef, useEffect, memo } from 'react'
import { deactivateTag } from '@/src/lib/supabase/events'

// Supabase UUID かどうかを判定（モックIDと区別するため）
function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

// ── Types ──────────────────────────────────────────────────────────────────────

type Mode            = 'light' | 'shadow'
type ItemKind        = 'tag' | 'avatar' | 'shadow-tag'
type CanvasEditMode  = 'menu' | 'tag-edit'
type ItemEditSubMode = 'move-tag' | null

type Item = {
  id:       string
  kind:     ItemKind
  content:  string
  x:        number   // % from left
  y:        number   // % from top
  size:     number
  rotation: number
  color?:   string
  count?:   number   // shadow-tag only
}

type DragState  = { id: string; ox: number; oy: number; startX: number; startY: number }
type PinchState = { itemId: string; dist0: number; angle0: number; size0: number; rotation0: number }

// ── Tag data ───────────────────────────────────────────────────────────────────

const LIGHT_TAGS_ALL = [
  '#内向型', '#インドア', '#映画', '#音楽好き',
  '#夜型', '#夜型リズム', '#ゲーマー', '#コーヒー',
  '#猫派', '#読書', '#旅行', '#アート',
  '#ひとり時間', '#HSP', '#充電中', '#深夜作業',
  '#朝型羨ましい', '#音楽', '#はじめまして', '#ほっと一息',
  '#まったり', '#のんびり', '#ふわふわ',
]
const LIGHT_TAG_READINGS: Record<string, string> = {
  '#内向型': 'ないこうがた', '#映画': 'えいが', '#音楽': 'おんがく',
  '#音楽好き': 'おんがくずき', '#猫派': 'ねこは', '#読書': 'どくしょ',
  '#旅行': 'りょこう', '#充電中': 'じゅうでんちゅう', '#深夜作業': 'しんやさぎょう',
  '#朝型羨ましい': 'あさがたうらやましい', '#夜型': 'よるがた', '#夜型リズム': 'よるがたりずむ',
  '#インドア': 'いんどあ', '#ひとり時間': 'ひとりじかん', '#まったり': 'まったり',
  '#のんびり': 'のんびり', '#ふわふわ': 'ふわふわ', '#はじめまして': 'はじめまして',
  '#ほっと一息': 'ほっとひといき', '#ゲーマー': 'げーまー', '#アート': 'あーと',
  '#コーヒー': 'こーひー', '#HSP': 'えいちえすぴー',
}

const SHADOW_TAGS_ALL = [
  '#孤独感', '#不安', '#眠れない', '#焦り',
  '#疲れた', '#消えたい', '#落ち込み', '#自己嫌悪',
  '#もう限界', '#息苦しい', '#迷子', '#誰かに話したい',
  '#自分が嫌い', '#ひとりぼっち', '#疎外感', '#空虚',
  '#眠れない夜', '#泣きたい', '#逃げたい', '#怖い',
]
const SHADOW_TAG_READINGS: Record<string, string> = {
  '#孤独感': 'こどくかん', '#不安': 'ふあん', '#眠れない': 'ねむれない',
  '#焦り': 'あせり', '#疲れた': 'つかれた', '#消えたい': 'きえたい',
  '#落ち込み': 'おちこみ', '#自己嫌悪': 'じこけんお', '#もう限界': 'もうげんかい',
  '#息苦しい': 'いきぐるしい', '#迷子': 'まいご', '#誰かに話したい': 'だれかにはなしたい',
  '#自分が嫌い': 'じぶんがきらい', '#ひとりぼっち': 'ひとりぼっち', '#疎外感': 'そがいかん',
  '#空虚': 'くうきょ', '#眠れない夜': 'ねむれないよる', '#泣きたい': 'なきたい',
  '#逃げたい': 'にげたい', '#怖い': 'こわい',
}
const SHADOW_TAG_COUNTS: Record<string, number> = {
  '#孤独感': 1204, '#不安': 876, '#眠れない': 543, '#焦り': 428,
  '#疲れた': 1891, '#消えたい': 312, '#落ち込み': 673, '#自己嫌悪': 441,
  '#もう限界': 289, '#息苦しい': 198, '#迷子': 156, '#誰かに話したい': 892,
  '#自分が嫌い': 367, '#ひとりぼっち': 721, '#疎外感': 284, '#空虚': 163,
  '#眠れない夜': 438, '#泣きたい': 592, '#逃げたい': 248, '#怖い': 315,
}

const ROW_START: Record<string, string> = {
  'あ': 'あいうえお',      'か': 'かきくけこがぎぐげご',
  'さ': 'さしすせそざじずぜぞ', 'た': 'たちつてとだぢづでど',
  'な': 'なにぬねの',      'は': 'はひふへほばびぶべぼぱぴぷぺぽ',
  'ま': 'まみむめも',      'や': 'やゆよ',
  'ら': 'らりるれろ',      'わ': 'わをん',
}

// PiP sub-canvas dimensions & scale (90px wide, 9:16 portrait)
const SUB_W     = 90
const SUB_H     = 160   // 90 * (16/9) ≈ 160
const SUB_SCALE = 0.26  // 90px / ~346px main canvas

// ── Mock initial data ──────────────────────────────────────────────────────────

const LIGHT_MOCK: Item[] = [
  { id: 'avatar', kind: 'avatar',  content: '',        x: 50, y: 46, size: 108, rotation: 0 },
  { id: 'lt-0',   kind: 'tag',     content: '#音楽',   x: 16, y: 11, size: 14,  rotation: -4, color: '#6d28d9' },
  { id: 'lt-1',   kind: 'tag',     content: '#夜型',   x: 66, y: 19, size: 14,  rotation:  3, color: '#6d28d9' },
  { id: 'lt-2',   kind: 'tag',     content: '#猫好き', x: 28, y: 31, size: 14,  rotation: -2, color: '#6d28d9' },
]

const SHADOW_MOCK: Item[] = [
  { id: 'avatar', kind: 'avatar',     content: '',          x: 50, y: 46, size: 108, rotation: 0 },
  { id: 'st-0',   kind: 'shadow-tag', content: '#孤独感',   x: 20, y: 15, size: 14,  rotation: -3, count: 1204 },
  { id: 'st-1',   kind: 'shadow-tag', content: '#不安',     x: 64, y: 26, size: 14,  rotation:  4, count: 876  },
  { id: 'st-2',   kind: 'shadow-tag', content: '#眠れない', x: 30, y: 68, size: 14,  rotation: -5, count: 543  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtCount(n: number): string {
  return n.toLocaleString('ja-JP')
}

function filterAndSortTags(
  tags: string[],
  readings: Record<string, string>,
  search: string,
  filter: string,
): string[] {
  const getReading = (t: string) => readings[t] ?? t.replace('#', '')
  let out = [...tags]
  if (search) {
    out = out.filter(t => t.includes(search) || getReading(t).includes(search))
  } else if (filter === 'A-Z') {
    out = out.filter(t => /^[A-Za-z]/.test(getReading(t)[0]))
    out.sort((a, b) => getReading(a).localeCompare(getReading(b), 'en', { sensitivity: 'base' }))
  } else if (filter !== 'すべて') {
    const valid = ROW_START[filter] ?? ''
    out = out.filter(t => valid.includes(getReading(t)[0]))
    out.sort((a, b) => getReading(a).localeCompare(getReading(b), 'ja'))
  } else {
    out.sort((a, b) => getReading(a).localeCompare(getReading(b), 'ja'))
  }
  return out
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const AvatarSVG = memo(function AvatarSVG({ size, mode }: { size: number; mode: Mode }) {
  return (
    <div style={{
      width: size, height: size,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.62, userSelect: 'none',
      filter: mode === 'shadow' ? 'brightness(0.55) saturate(0.4)' : 'none',
      transition: 'filter 0.5s ease',
    }}>👤</div>
  )
})

function LightTag({ item, selected }: { item: Item; selected: boolean }) {
  return (
    <span style={{
      display: 'block', fontSize: `${item.size}px`,
      background: item.color ? `${item.color}18` : 'rgba(109,40,217,0.12)',
      color: item.color ?? '#6d28d9',
      padding: '3px 11px', borderRadius: '12px',
      border: `1.5px solid ${item.color ? `${item.color}40` : 'rgba(109,40,217,0.28)'}`,
      whiteSpace: 'nowrap', fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: 600, lineHeight: 1.5,
      boxShadow: selected ? `0 0 0 2px ${item.color ?? '#6d28d9'}` : 'none',
      transition: 'box-shadow 0.15s',
    }}>{item.content}</span>
  )
}

function ShadowTagItem({ item, selected }: { item: Item; selected: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: 'rgba(255,255,255,0.04)',
      border: selected ? '1.5px solid rgba(167,139,250,0.55)' : '1.5px solid rgba(255,255,255,0.10)',
      borderRadius: '12px', padding: '5px 14px 6px',
      backdropFilter: 'blur(6px)',
      boxShadow: selected ? '0 0 12px rgba(167,139,250,0.25)' : '0 2px 8px rgba(0,0,0,0.35)',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      whiteSpace: 'nowrap', minWidth: 0,
    }}>
      <span style={{
        fontSize: `${item.size}px`, fontWeight: 700,
        color: 'rgba(200,185,240,0.92)',
        fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: 1.4,
      }}>{item.content}</span>
      {item.count !== undefined && (
        <span style={{
          fontSize: `${item.size * 0.78}px`, color: 'rgba(255,255,255,0.36)',
          fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: 1.3, marginTop: 1,
        }}>{fmtCount(item.count)}人が共感</span>
      )}
    </div>
  )
}

// ── SubItem: PiP 用の縮小アイテム描画 ────────────────────────────────────────────

function SubItem({ item, mode }: { item: Item; mode: Mode }) {
  const s = SUB_SCALE
  if (item.kind === 'avatar') {
    const sz = Math.round(item.size * s)
    return (
      <div style={{
        width: sz, height: sz,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(sz * 0.62), userSelect: 'none',
        filter: mode === 'shadow' ? 'brightness(0.55) saturate(0.4)' : 'none',
      }}>👤</div>
    )
  }
  if (item.kind === 'tag') {
    return (
      <span style={{
        display: 'block', fontSize: `${Math.round(item.size * s)}px`,
        background: item.color ? `${item.color}18` : 'rgba(109,40,217,0.12)',
        color: item.color ?? '#6d28d9',
        padding: '1px 5px', borderRadius: '6px',
        border: `1px solid ${item.color ? `${item.color}40` : 'rgba(109,40,217,0.28)'}`,
        whiteSpace: 'nowrap', fontFamily: 'system-ui, sans-serif',
        fontWeight: 600, lineHeight: 1.5,
      }}>{item.content}</span>
    )
  }
  // shadow-tag
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: `${Math.round(12 * s)}px`,
      padding: `2px ${Math.round(14 * s)}px`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        fontSize: `${Math.round(item.size * s)}px`, fontWeight: 700,
        color: 'rgba(200,185,240,0.92)',
        fontFamily: 'system-ui, sans-serif', lineHeight: 1.4,
      }}>{item.content}</span>
    </div>
  )
}

// ── Shared modal button styles ─────────────────────────────────────────────────

const MODAL_BTN: React.CSSProperties = {
  width: '100%', padding: '13px', borderRadius: '12px',
  background: 'rgba(167,139,250,0.15)', color: '#c4b5fd',
  border: '1px solid rgba(167,139,250,0.3)',
  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
}
const MODAL_CLOSE_BTN: React.CSSProperties = {
  width: '100%', padding: '10px', borderRadius: '12px',
  background: 'none', color: 'rgba(255,255,255,0.4)',
  border: 'none', fontSize: '13px', cursor: 'pointer',
}
const MODAL_SHELL: React.CSSProperties = {
  background: '#1a1a2e', borderRadius: '20px',
  padding: '20px 16px', width: '280px',
  border: '1px solid rgba(167,139,250,0.2)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
}
const MODAL_OVERLAY: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 30,
}

// ── CanvasView ─────────────────────────────────────────────────────────────────

export function CanvasView({
  initialLightItems,
  initialShadowItems,
}: {
  initialLightItems?:  Item[]
  initialShadowItems?: Item[]
} = {}) {

  // ── core state ────────────────────────────────────────────────────────────
  const [mode,           setMode]           = useState<Mode>('light')
  const [fading,         setFading]         = useState(false)
  const [lightItems,     setLightItems]     = useState<Item[]>(initialLightItems  ?? LIGHT_MOCK)
  const [shadowItems,    setShadowItems]    = useState<Item[]>(initialShadowItems ?? SHADOW_MOCK)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  // ── edit state ────────────────────────────────────────────────────────────
  const [editMenuOpen,    setEditMenuOpen]    = useState(false)
  const [canvasEditMode,  setCanvasEditMode]  = useState<CanvasEditMode>('menu')
  const [itemEditSubMode, setItemEditSubMode] = useState<ItemEditSubMode>(null)
  const [tagPickerOpen,   setTagPickerOpen]   = useState(false)
  const [tagSearch,       setTagSearch]       = useState('')
  const [tagFilter,       setTagFilter]       = useState('すべて')
  const [selectedTag,     setSelectedTag]     = useState<string | null>(null)

  // ── refs ──────────────────────────────────────────────────────────────────
  const canvasRef            = useRef<HTMLDivElement | null>(null)
  const modeRef              = useRef<Mode>(mode);
  modeRef.current            = mode
  const lightItemsRef        = useRef<Item[]>(lightItems);
  lightItemsRef.current      = lightItems
  const shadowItemsRef       = useRef<Item[]>(shadowItems);
  shadowItemsRef.current     = shadowItems
  const selectedItemIdRef    = useRef<string | null>(null);
  selectedItemIdRef.current  = selectedItemId
  const itemEditSubModeRef   = useRef<ItemEditSubMode>(null);
  itemEditSubModeRef.current = itemEditSubMode
  const dragState            = useRef<DragState | null>(null)
  const didDrag              = useRef(false)
  const pinchState           = useRef<PinchState | null>(null)
  const pinchActive          = useRef(false)

  // ── derived ───────────────────────────────────────────────────────────────
  const activeItems  = mode === 'light' ? lightItems  : shadowItems
  const subItems     = mode === 'light' ? shadowItems : lightItems
  const subMode      = (mode === 'light' ? 'shadow' : 'light') as Mode
  const selectedItem = activeItems.find(it => it.id === selectedItemId) ?? null
  const activeColor  = mode === 'light' ? '#6d28d9' : '#a78bfa'
  const dt = mode === 'light'
    ? { border: 'rgba(0,0,0,0.08)', subText: '#64748b', headerBg: 'rgba(255,255,255,0.90)' }
    : { border: 'rgba(255,255,255,0.06)', subText: 'rgba(255,255,255,0.45)', headerBg: 'rgba(30,26,46,0.97)' }

  // ── mode toggle ───────────────────────────────────────────────────────────
  const toggleMode = () => {
    setFading(true)
    setSelectedItemId(null)
    setItemEditSubMode(null)
    setEditMenuOpen(false)
    setCanvasEditMode('menu')
  }
  useEffect(() => {
    if (!fading) return
    const t = setTimeout(() => {
      setMode(prev => prev === 'light' ? 'shadow' : 'light')
      setFading(false)
    }, 220)
    return () => clearTimeout(t)
  }, [fading])

  // ── item helpers ──────────────────────────────────────────────────────────
  const patchItem = (id: string, patch: Partial<Item>) => {
    const updater = (prev: Item[]) => prev.map(it => it.id !== id ? it : { ...it, ...patch })
    if (modeRef.current === 'light') setLightItems(updater)
    else setShadowItems(updater)
  }

  const deleteItem = (id: string) => {
    const updater = (prev: Item[]) => prev.filter(it => it.id !== id)
    if (mode === 'light') setLightItems(updater)
    else setShadowItems(updater)
    setSelectedItemId(null)
    // Supabase 保存済みタグなら deactivated イベントを fire-and-forget で記録
    if (isUUID(id)) {
      const userId = sessionStorage.getItem('user_id')
      if (userId) deactivateTag(id, userId)
    }
  }

  const insertTag = (tag: string) => {
    const id   = `tag-${Date.now()}`
    const x    = 20 + Math.random() * 60
    const y    = 20 + Math.random() * 60
    const item: Item = mode === 'light'
      ? { id, kind: 'tag',        content: tag, x, y, size: 14, rotation: 0, color: '#6d28d9' }
      : { id, kind: 'shadow-tag', content: tag, x, y, size: 14, rotation: 0, count: SHADOW_TAG_COUNTS[tag] ?? 0 }
    if (mode === 'light') setLightItems(prev => [...prev, item])
    else                  setShadowItems(prev => [...prev, item])
    setSelectedItemId(id)
    setTagPickerOpen(false)
    setSelectedTag(null)
    setTagSearch('')
    setTagFilter('すべて')
  }

  const closeTagPicker = () => {
    setTagPickerOpen(false)
    setSelectedTag(null)
    setTagSearch('')
    setTagFilter('すべて')
  }

  // ── 2-finger pinch / rotate ───────────────────────────────────────────────
  const onCanvasTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2) return
    const id   = selectedItemIdRef.current;  if (!id) return
    const items = modeRef.current === 'light' ? lightItemsRef.current : shadowItemsRef.current
    const item  = items.find(d => d.id === id);  if (!item) return
    const [t0, t1] = [e.touches[0], e.touches[1]]
    pinchState.current = {
      itemId:    id,
      dist0:     Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY),
      angle0:    Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX),
      size0:     item.size,
      rotation0: item.rotation,
    }
    pinchActive.current = true
  }
  const onCanvasTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2 || !pinchState.current) return
    const ps    = pinchState.current
    const items = modeRef.current === 'light' ? lightItemsRef.current : shadowItemsRef.current
    const item  = items.find(d => d.id === ps.itemId);  if (!item) return
    const [t0, t1] = [e.touches[0], e.touches[1]]
    const dist  = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
    const angle = Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX)
    const isAv  = item.kind === 'avatar'
    const newSize     = Math.max(isAv ? 40 : 12, Math.min(isAv ? 180 : 56, Math.round(ps.size0 * dist / ps.dist0)))
    const newRotation = Math.round(ps.rotation0 + (angle - ps.angle0) * 180 / Math.PI)
    const updater = (prev: Item[]) =>
      prev.map(it => it.id !== ps.itemId ? it : { ...it, size: newSize, rotation: newRotation })
    if (modeRef.current === 'light') setLightItems(updater)
    else                             setShadowItems(updater)
  }
  const onCanvasTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) { pinchState.current = null; pinchActive.current = false }
  }

  // ── item drag (Pointer Events — mouse + single-finger touch) ─────────────
  // Drag is only active in 'move-tag' sub-mode for tag/shadow-tag items.
  // Outside that mode, tapping just toggles selection.
  const onCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pinchActive.current || fading) return
    const el = (e.target as HTMLElement).closest('[data-item-id]') as HTMLElement | null
    if (!el) { setSelectedItemId(null); return }
    const id    = el.dataset.itemId!
    const items = modeRef.current === 'light' ? lightItemsRef.current : shadowItemsRef.current
    const item  = items.find(d => d.id === id);  if (!item) return

    const canDrag =
      itemEditSubModeRef.current === 'move-tag' &&
      (item.kind === 'tag' || item.kind === 'shadow-tag')

    if (!canDrag) {
      if (item.kind !== 'avatar') setSelectedItemId(prev => prev === id ? null : id)
      return
    }

    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = canvasRef.current!.getBoundingClientRect()
    dragState.current = {
      id,
      ox:     ((e.clientX - rect.left) / rect.width)  * 100 - item.x,
      oy:     ((e.clientY - rect.top)  / rect.height) * 100 - item.y,
      startX: e.clientX,
      startY: e.clientY,
    }
    didDrag.current = false
  }

  const onCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return
    const ds = dragState.current
    if (!didDrag.current) {
      if (Math.hypot(e.clientX - ds.startX, e.clientY - ds.startY) < 6) return
      didDrag.current = true
    }
    const rect = canvasRef.current!.getBoundingClientRect()
    const nx = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width)  * 100 - ds.ox))
    const ny = Math.max(2, Math.min(98, ((e.clientY - rect.top)  / rect.height) * 100 - ds.oy))
    const updater = (prev: Item[]) => prev.map(it => it.id !== ds.id ? it : { ...it, x: nx, y: ny })
    if (modeRef.current === 'light') setLightItems(updater)
    else                             setShadowItems(updater)
  }

  const onCanvasPointerUp = () => {
    const ds      = dragState.current
    const wasDrag = didDrag.current
    dragState.current = null
    didDrag.current   = false
    if (!ds) return
    if (!wasDrag) setSelectedItemId(prev => prev === ds.id ? null : ds.id)
  }

  // ── tag picker list (memoised inline) ────────────────────────────────────
  const pickerTags  = mode === 'light' ? LIGHT_TAGS_ALL  : SHADOW_TAGS_ALL
  const pickerRead  = mode === 'light' ? LIGHT_TAG_READINGS : SHADOW_TAG_READINGS
  const filteredTags = filterAndSortTags(pickerTags, pickerRead, tagSearch, tagFilter)

  // ── canvas visual vars ────────────────────────────────────────────────────
  const canvasBg          = mode === 'light' ? 'white' : 'linear-gradient(160deg, #0d0c18 0%, #141428 55%, #1a1a30 100%)'
  const canvasBorderColor = mode === 'light' ? '#c8c8c8' : '#2a2a45'

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex items-center justify-center min-h-screen bg-black"
      style={{ position: 'relative' }}
    >

      {/* ── Canvas wrapper（PiP + main canvas の位置基準） ───────── */}
      <div style={{ position: 'relative', width: '320px', marginTop: '60px' }}>

        {/* ── PiP sub-canvas ── メインキャンバスのすぐ上・左端に接して配置 ── */}
        <div
          onClick={() => { if (!fading) toggleMode() }}
          aria-label={`${subMode === 'light' ? '実' : '根'}モードのプレビュー。タップして切り替え`}
          style={{
            position: 'absolute', top: '-142px', left: '0px',
            width: '80px', height: '142px',
            borderRadius: '12px', overflow: 'hidden', zIndex: 10,
            background: subMode === 'light'
              ? 'white'
              : 'linear-gradient(160deg, #0d0c18 0%, #141428 55%, #1a1a30 100%)',
            border: subMode === 'light'
              ? '2.5px solid rgba(180,180,180,0.85)'
              : '2.5px solid rgba(80,60,140,0.75)',
            boxShadow: '0 8px 28px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            opacity: fading ? 0 : 1,
            transform: fading ? 'scale(0.94)' : 'scale(1)',
            transition: 'opacity 0.22s ease, transform 0.28s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {subMode === 'shadow' && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: `
                radial-gradient(1px 1px at 20% 15%, rgba(255,255,255,0.4) 0%, transparent 100%),
                radial-gradient(1px 1px at 75% 25%, rgba(255,255,255,0.3) 0%, transparent 100%),
                radial-gradient(1px 1px at 45% 60%, rgba(255,255,255,0.25) 0%, transparent 100%),
                radial-gradient(1px 1px at 85% 70%, rgba(255,255,255,0.3) 0%, transparent 100%),
                radial-gradient(1px 1px at 12% 82%, rgba(255,255,255,0.25) 0%, transparent 100%)`,
            }} />
          )}
          {subItems.map(item => (
            <div key={item.id} style={{
              position: 'absolute',
              left: `${item.x}%`, top: `${item.y}%`,
              transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
              userSelect: 'none', pointerEvents: 'none',
              zIndex: item.kind === 'avatar' ? 3 : 2,
            }}>
              <SubItem item={item} mode={subMode} />
            </div>
          ))}
          <span style={{
            position: 'absolute', bottom: 5, right: 7,
            fontSize: 9, letterSpacing: '0.06em', fontWeight: 600,
            color: subMode === 'light' ? 'rgba(0,0,0,0.32)' : 'rgba(200,185,240,0.50)',
            fontFamily: 'system-ui, sans-serif', pointerEvents: 'none',
          }}>
            {subMode === 'light' ? '実' : '根'}
          </span>
        </div>

        <div
          ref={canvasRef}
          style={{
            width: '320px', height: '568px',
            touchAction: 'none',
            background: canvasBg,
            border: `6px solid ${canvasBorderColor}`,
            borderRadius: '12px',
            boxShadow: mode === 'light'
              ? '0 24px 64px rgba(0,0,0,0.28), inset 0 0 0 2px #ebebeb, inset 0 0 0 3px #b8b8b8'
              : '0 24px 64px rgba(0,0,0,0.70), inset 0 0 0 2px rgba(255,255,255,0.04), inset 0 0 0 3px rgba(80,60,140,0.25)',
            position: 'relative', overflow: 'hidden',
            transition: 'background 0.55s ease, border-color 0.55s ease, box-shadow 0.55s ease',
          }}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onTouchStart={onCanvasTouchStart}
          onTouchMove={onCanvasTouchMove}
          onTouchEnd={onCanvasTouchEnd}
        >
          {/* Starfield (shadow mode) */}
          {mode === 'shadow' && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
              backgroundImage: `
                radial-gradient(1px 1px at 15% 20%, rgba(255,255,255,0.35) 0%, transparent 100%),
                radial-gradient(1px 1px at 78% 12%, rgba(255,255,255,0.28) 0%, transparent 100%),
                radial-gradient(1px 1px at 42% 55%, rgba(255,255,255,0.22) 0%, transparent 100%),
                radial-gradient(1px 1px at 88% 40%, rgba(255,255,255,0.30) 0%, transparent 100%),
                radial-gradient(1px 1px at 25% 82%, rgba(255,255,255,0.25) 0%, transparent 100%),
                radial-gradient(1.5px 1.5px at 5% 35%, rgba(255,255,255,0.18) 0%, transparent 100%),
                radial-gradient(1.5px 1.5px at 93% 68%, rgba(255,255,255,0.22) 0%, transparent 100%)`,
            }} />
          )}

          {/* Items */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            opacity: fading ? 0 : 1, transition: 'opacity 0.22s ease',
          }}>
            {activeItems.map(item => {
              const isSelected = selectedItemId === item.id
              const isTag      = item.kind === 'tag' || item.kind === 'shadow-tag'
              const draggable  = itemEditSubMode === 'move-tag' && isTag
              return (
                <div
                  key={item.id}
                  data-item-id={item.id}
                  style={{
                    position: 'absolute',
                    left: `${item.x}%`, top: `${item.y}%`,
                    transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                    userSelect: 'none', touchAction: 'none',
                    cursor: draggable ? 'grab' : 'pointer',
                    zIndex: isSelected ? 10 : item.kind === 'avatar' ? 3 : 2,
                    outline: isSelected && isTag
                      ? `2px dashed ${mode === 'light' ? 'rgba(109,40,217,0.55)' : 'rgba(167,139,250,0.55)'}`
                      : 'none',
                    outlineOffset: 4,
                  }}
                >
                  {item.kind === 'avatar'      ? <AvatarSVG size={item.size} mode={mode} />
                  : item.kind === 'tag'         ? <LightTag item={item} selected={isSelected} />
                  : /* shadow-tag */              <ShadowTagItem item={item} selected={isSelected} />}
                </div>
              )
            })}
          </div>

          {/* "shadow" label */}
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            opacity: mode === 'shadow' && !fading ? 0.55 : 0,
            transition: 'opacity 0.45s ease',
            pointerEvents: 'none', zIndex: 20,
          }}>
            <span style={{
              fontSize: 11, letterSpacing: '0.12em',
              color: 'rgba(200,185,240,0.9)',
              fontFamily: 'system-ui, sans-serif', fontWeight: 600,
              textTransform: 'uppercase',
            }}>shadow</span>
          </div>

        </div>

        {/* FAB ── キャンバス外・右下に配置 */}
        <button
          onClick={() => setEditMenuOpen(true)}
          style={{
            position: 'absolute', bottom: -20, right: -20,
            width: 48, height: 48, borderRadius: '50%',
            background: '#ec4899', color: 'white', fontSize: 22,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(236,72,153,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 40,
          }}
        >🎨</button>
      </div>

      {/* ── Move-mode bottom sheet (参照元そのまま) ─────────────── */}
      {itemEditSubMode !== null && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: '#1a1a2e',
          borderTop: '1px solid rgba(167,139,250,0.18)',
          padding: '12px 16px 32px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>タグを編集中</span>
            <button
              onClick={() => { setItemEditSubMode(null); setSelectedItemId(null) }}
              style={{ color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', fontSize: 12, cursor: 'pointer' }}
            >完了</button>
          </div>

          {selectedItem && selectedItem.kind !== 'avatar' ? (
            <div>
              <div style={{ marginBottom: 8 }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: '0 0 4px' }}>大きさ</p>
                <input type="range" min="10" max="40" step="1"
                  value={selectedItem.size}
                  onChange={e => patchItem(selectedItem.id, { size: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: '0 0 4px' }}>角度</p>
                <input type="range" min="-180" max="180" step="1"
                  value={selectedItem.rotation}
                  onChange={e => patchItem(selectedItem.id, { rotation: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>
              <button
                onClick={() => deleteItem(selectedItem.id)}
                style={{
                  width: '100%', padding: '10px', borderRadius: '12px',
                  background: 'rgba(239,68,68,0.12)', color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.28)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >🗑️ 削除する</button>
            </div>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0, textAlign: 'center' }}>
              タグをタップして選択してください
            </p>
          )}
        </div>
      )}

      {/* ── Edit menu modal (参照元そのまま) ─────────────────────── */}
      {editMenuOpen && (
        <div style={MODAL_OVERLAY} onClick={() => { setEditMenuOpen(false); setCanvasEditMode('menu') }}>
          <div style={MODAL_SHELL} onClick={e => e.stopPropagation()}>

            {canvasEditMode === 'menu' && (
              <>
                <p style={{ textAlign: 'center', fontWeight: 700, color: 'white', fontSize: 15, margin: '0 0 16px' }}>
                  キャンバスを編集
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button style={MODAL_BTN} onClick={() => setCanvasEditMode('tag-edit')}>
                    🏷️ タグを編集する
                  </button>
                  <button style={MODAL_CLOSE_BTN}
                    onClick={() => { setEditMenuOpen(false); setCanvasEditMode('menu') }}>
                    とじる
                  </button>
                </div>
              </>
            )}

            {canvasEditMode === 'tag-edit' && (
              <>
                <p style={{ textAlign: 'center', fontWeight: 700, color: 'white', fontSize: 15, margin: '0 0 16px' }}>
                  🏷️ タグを編集する
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button style={MODAL_BTN}
                    onClick={() => { setItemEditSubMode('move-tag'); setEditMenuOpen(false); setCanvasEditMode('menu') }}>
                    既存のタグを編集
                  </button>
                  <button style={MODAL_BTN}
                    onClick={() => { setTagPickerOpen(true); setEditMenuOpen(false); setCanvasEditMode('menu') }}>
                    ＋ 新規追加
                  </button>
                  <button style={MODAL_CLOSE_BTN} onClick={() => setCanvasEditMode('menu')}>
                    ← もどる
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Tag picker modal (参照元そのまま、モードで出し分け) ───── */}
      {tagPickerOpen && (
        <div style={{ ...MODAL_OVERLAY, zIndex: 9999, alignItems: 'center' }}>
          <div style={{
            width: '85%', maxHeight: '70vh',
            background: 'rgba(15,14,26,0.97)', backdropFilter: 'blur(18px)',
            borderRadius: '20px',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>

            {/* Header */}
            <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: 0 }}>
                {mode === 'light' ? 'タグを選ぶ' : '根タグを選ぶ'}
              </p>
              <button onClick={closeTagPicker}
                style={{ color: 'rgba(255,255,255,0.45)', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* Search */}
            <div style={{ padding: '0 16px 8px', flexShrink: 0 }}>
              <input
                type="text" placeholder="タグを検索..." value={tagSearch}
                onChange={e => setTagSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.90)',
                  fontSize: 14, border: '1px solid rgba(255,255,255,0.12)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 50音 filter */}
            <div style={{ display: 'flex', gap: 4, padding: '0 16px 8px', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
              {['すべて', 'あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ', 'A-Z'].map(row => (
                <button key={row} onClick={() => setTagFilter(row)}
                  style={{
                    padding: '4px 8px', borderRadius: '12px', flexShrink: 0,
                    background: tagFilter === row ? activeColor : 'rgba(255,255,255,0.10)',
                    color: tagFilter === row ? '#fff' : 'rgba(255,255,255,0.45)',
                    fontSize: 11, border: 'none', cursor: 'pointer',
                  }}>{row}</button>
              ))}
            </div>

            {/* Tag list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredTags.map(tag => (
                  <button key={tag}
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '13px 16px',
                      background: tag === selectedTag ? `${activeColor}33` : 'transparent',
                      color: tag === selectedTag ? activeColor : 'rgba(255,255,255,0.90)',
                      fontSize: 14, fontWeight: tag === selectedTag ? 700 : 400,
                      border: 'none', cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      {tag}
                      {mode === 'shadow' && SHADOW_TAG_COUNTS[tag] !== undefined && (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 8 }}>
                          {fmtCount(SHADOW_TAG_COUNTS[tag])}人
                        </span>
                      )}
                    </span>
                    {tag === selectedTag && <span style={{ fontSize: 13 }}>✓</span>}
                  </button>
                ))}
                {filteredTags.length === 0 && (
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, padding: '20px 16px', textAlign: 'center', margin: 0 }}>
                    タグが見つかりません
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              flexShrink: 0, padding: '12px 16px',
              borderTop: `1px solid ${dt.border}`,
              background: dt.headerBg,
            }}>
              {selectedTag ? (
                <button
                  onClick={() => insertTag(selectedTag)}
                  style={{
                    width: '100%', padding: '13px', borderRadius: '24px',
                    background: activeColor, color: '#fff', fontSize: 15, fontWeight: 700,
                    border: 'none', cursor: 'pointer',
                    boxShadow: `0 4px 14px ${activeColor}55`,
                  }}
                >「{selectedTag}」を挿入する</button>
              ) : (
                <p style={{ color: dt.subText, fontSize: 13, textAlign: 'center', padding: '8px 0', margin: 0 }}>
                  タグを選んでください
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
