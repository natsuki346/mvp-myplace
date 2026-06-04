'use client'

import { useEffect, useRef, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

export type TagItem = {
  id:     string
  kind?:  'tag' | 'avatar'   // undefined → tag
  content: string
  x:      number   // % from left
  y:      number   // % from top
  color:  string   // hsl(...) format
}

type DragState = { id: string; ox: number; oy: number; startX: number; startY: number }
type HSL       = { h: number; s: number; l: number }

// ── Helpers ────────────────────────────────────────────────────────────────────

const HUE_GRADIENT =
  'linear-gradient(to right,' +
  Array.from({ length: 13 }, (_, i) => `hsl(${i * 30},80%,55%)`).join(',') + ')'

function hslToHsla(hsl: string, alpha: number): string {
  // 'hsl(270,60%,45%)' → 'hsla(270,60%,45%,0.12)'
  return hsl.replace(/^hsl\(/, 'hsla(').replace(/\)$/, `,${alpha})`)
}

function parseHSL(color: string): HSL {
  const m = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
  if (m) return { h: +m[1], s: +m[2], l: +m[3] }
  return { h: 270, s: 60, l: 55 }
}

function hslStr({ h, s, l }: HSL): string { return `hsl(${h},${s}%,${l}%)` }

// ── Initial layout ─────────────────────────────────────────────────────────────

const POSITIONS = [
  { x: 14, y: 13 }, { x: 58, y: 10 }, { x: 20, y: 33 },
  { x: 66, y: 31 }, { x:  9, y: 56 }, { x: 52, y: 58 },
  { x: 18, y: 76 }, { x: 68, y: 72 }, { x: 38, y: 85 },
]

function buildItems(tags: string[], isLight: boolean): TagItem[] {
  const defaultColor = isLight ? 'hsl(270,60%,45%)' : 'hsl(270,60%,70%)'
  const avatarColor  = isLight ? 'hsl(270,60%,50%)' : 'hsl(270,55%,65%)'
  return [
    { id: 'avatar', kind: 'avatar', content: '', x: 50, y: 44, color: avatarColor },
    ...tags.map((content, i) => {
      const pos   = POSITIONS[i % POSITIONS.length]
      const extra = i >= POSITIONS.length ? (i - POSITIONS.length + 1) * 8 : 0
      return { id: `item-${i}`, kind: 'tag' as const, content, x: pos.x + extra, y: pos.y + extra, color: defaultColor }
    }),
  ]
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CanvasEditor({
  variant,
  title,
  icon,
  initialTags,
  onComplete,
  onSkip,
  onRemoveTag,
  onEdit,
}: {
  variant:       'light' | 'shadow'
  title:         string
  icon:          string
  initialTags:   string[]
  onComplete:    (items: TagItem[]) => void
  onSkip:        () => void
  onRemoveTag?:  (text: string) => void
  onEdit?:       () => void             // ドラッグ or HSL 変更時に1回だけ呼ばれる
}) {
  const isLight = variant === 'light'

  const [items,      setItems]      = useState<TagItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hsl,        setHsl]        = useState<HSL>({ h: 270, s: 60, l: 55 })

  const canvasRef    = useRef<HTMLDivElement | null>(null)
  const itemsRef     = useRef<TagItem[]>([])
  itemsRef.current   = items
  const hasEditedRef = useRef(false)       // onEdit は1回だけ

  const dragState = useRef<DragState | null>(null)
  const didDrag   = useRef(false)

  const triggerOnEdit = () => {
    if (!hasEditedRef.current && onEdit) {
      hasEditedRef.current = true
      onEdit()
    }
  }

  useEffect(() => {
    setItems(buildItems(initialTags, isLight))
  }, [initialTags, isLight])

  // HSL を選択アイテムの現在色で初期化
  useEffect(() => {
    if (!selectedId) return
    const item = itemsRef.current.find(t => t.id === selectedId)
    if (item) setHsl(parseHSL(item.color))
  }, [selectedId])

  // ── Drag (Pointer Events) ──────────────────────────────────────────────────

  const onCanvasDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest('[data-item-id]') as HTMLElement | null
    if (!el) { setSelectedId(null); return }
    const id   = el.dataset.itemId!
    const item = itemsRef.current.find(t => t.id === id)
    if (!item) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = canvasRef.current!.getBoundingClientRect()
    dragState.current = {
      id,
      ox:     ((e.clientX - rect.left) / rect.width)  * 100 - item.x,
      oy:     ((e.clientY - rect.top)  / rect.height) * 100 - item.y,
      startX: e.clientX, startY: e.clientY,
    }
    didDrag.current = false
  }

  const onCanvasMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return
    const ds = dragState.current
    if (!didDrag.current) {
      if (Math.hypot(e.clientX - ds.startX, e.clientY - ds.startY) < 5) return
      didDrag.current = true
      triggerOnEdit()
    }
    const rect = canvasRef.current!.getBoundingClientRect()
    const nx = Math.max(3, Math.min(93, ((e.clientX - rect.left) / rect.width)  * 100 - ds.ox))
    const ny = Math.max(3, Math.min(90, ((e.clientY - rect.top)  / rect.height) * 100 - ds.oy))
    setItems(prev => prev.map(t => t.id === ds.id ? { ...t, x: nx, y: ny } : t))
  }

  const onCanvasUp = () => {
    const ds      = dragState.current
    const wasDrag = didDrag.current
    dragState.current = null
    didDrag.current   = false
    if (!ds) return
    if (!wasDrag) setSelectedId(prev => prev === ds.id ? null : ds.id)
  }

  // ── HSL 変更 ───────────────────────────────────────────────────────────────

  const applyHSL = (newHsl: HSL) => {
    setHsl(newHsl)
    triggerOnEdit()
    if (!selectedId) return
    const color = hslStr(newHsl)
    setItems(prev => prev.map(t => t.id === selectedId ? { ...t, color } : t))
  }

  const selectedItem = items.find(t => t.id === selectedId) ?? null

  // ── Slider gradient backgrounds ────────────────────────────────────────────

  const satGradient = `linear-gradient(to right, hsl(${hsl.h},0%,${hsl.l}%), hsl(${hsl.h},100%,${hsl.l}%))`
  const litGradient = `linear-gradient(to right, hsl(${hsl.h},${hsl.s}%,0%), hsl(${hsl.h},${hsl.s}%,50%), hsl(${hsl.h},${hsl.s}%,100%))`
  const labelColor  = isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      position: 'relative', height: '100svh',
      maxWidth: 390, margin: '0 auto',
      overflow: 'hidden',
      background: isLight ? '#e8e8e8' : '#07060f',
    }}>

      {/* Slider CSS */}
      <style>{`
        .ce-slider {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 8px; border-radius: 4px;
          outline: none; cursor: pointer; border: none;
        }
        .ce-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 18px; height: 18px;
          border-radius: 50%; background: white;
          border: 2px solid rgba(0,0,0,0.25);
          box-shadow: 0 1px 4px rgba(0,0,0,0.35); cursor: pointer;
        }
        .ce-slider::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%; background: white;
          border: 2px solid rgba(0,0,0,0.25);
          box-shadow: 0 1px 4px rgba(0,0,0,0.35); cursor: pointer;
          border: none;
        }
      `}</style>

      {/* ── Canvas ─────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        style={{
          position: 'absolute', inset: 0,
          background: isLight
            ? 'white'
            : 'linear-gradient(160deg, #0d0c18 0%, #141428 55%, #1a1a30 100%)',
          touchAction: 'none',
        }}
        onPointerDown={onCanvasDown}
        onPointerMove={onCanvasMove}
        onPointerUp={onCanvasUp}
      >
        {items.map(item => {
          const selected = item.id === selectedId
          const isAvatar = item.kind === 'avatar'
          return (
            <div
              key={item.id}
              data-item-id={item.id}
              style={{
                position: 'absolute',
                left: `${item.x}%`, top: `${item.y}%`,
                transform: 'translate(-50%, -50%)',
                userSelect: 'none', touchAction: 'none',
                cursor: 'grab', zIndex: selected ? 10 : (isAvatar ? 3 : 2),
              }}
            >
              {isAvatar ? (
                // ── アバター ──────────────────────────────────
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: item.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, userSelect: 'none',
                  boxShadow: selected
                    ? `0 0 0 3px white, 0 0 0 5px ${item.color}`
                    : '0 4px 14px rgba(0,0,0,0.28)',
                  transition: 'box-shadow 0.15s',
                }}>👤</div>
              ) : (
                // ── タグ ──────────────────────────────────────
                <>
                  <span style={{
                    display: 'block',
                    fontSize: 14, fontWeight: 600, lineHeight: 1.5,
                    padding: '4px 12px', borderRadius: 12, whiteSpace: 'nowrap',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    background: hslToHsla(item.color, isLight ? 0.12 : 0.22),
                    color:      item.color,
                    border:     `1.5px solid ${hslToHsla(item.color, isLight ? 0.38 : 0.55)}`,
                    boxShadow:  selected ? `0 0 0 2.5px ${item.color}` : 'none',
                    transition: 'box-shadow 0.15s',
                  }}>{item.content}</span>

                  {/* ── × 削除ボタン ── */}
                  {onRemoveTag && (
                    <button
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => {
                        e.stopPropagation()
                        setItems(prev => prev.filter(t => t.id !== item.id))
                        onRemoveTag(item.content)
                      }}
                      style={{
                        position: 'absolute', top: -8, right: -8,
                        width: 18, height: 18, borderRadius: '50%',
                        background: isLight ? 'rgba(0,0,0,0.52)' : 'rgba(255,255,255,0.55)',
                        color:      isLight ? 'white' : '#0d0c18',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, lineHeight: 1,
                        padding: 0, touchAction: 'none', zIndex: 20,
                      }}
                    >×</button>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Top bar ────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        background: isLight
          ? 'linear-gradient(to bottom, rgba(255,255,255,0.88), transparent)'
          : 'linear-gradient(to bottom, rgba(7,6,15,0.80), transparent)',
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: isLight ? '#1a1a1a' : 'white' }}>
            {title}
          </span>
        </div>
        <button
          onClick={onSkip}
          style={{
            fontSize: 13, background: 'none', border: 'none', cursor: 'pointer',
            color: isLight ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.42)',
            pointerEvents: 'auto',
          }}
        >スキップ</button>
      </div>

      {/* ── Bottom bar ─────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
        padding: '14px 20px 36px',
        background: isLight
          ? 'linear-gradient(to top, rgba(255,255,255,0.97) 65%, transparent)'
          : 'linear-gradient(to top, rgba(7,6,15,0.97) 65%, transparent)',
      }}>

        {/* ── HSL スライダー（選択中のみ表示）── */}
        {selectedItem && (
          <div style={{ marginBottom: 16 }}>

            {/* Hue */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: labelColor, width: 22, flexShrink: 0 }}>色相</span>
              <input
                type="range" min="0" max="360" value={hsl.h}
                className="ce-slider"
                style={{ background: HUE_GRADIENT }}
                onChange={e => applyHSL({ ...hsl, h: +e.target.value })}
              />
              <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: hslStr(hsl), border: '1.5px solid rgba(128,128,128,0.3)' }} />
            </div>

            {/* Saturation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: labelColor, width: 22, flexShrink: 0 }}>彩度</span>
              <input
                type="range" min="0" max="100" value={hsl.s}
                className="ce-slider"
                style={{ background: satGradient }}
                onChange={e => applyHSL({ ...hsl, s: +e.target.value })}
              />
            </div>

            {/* Lightness */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: labelColor, width: 22, flexShrink: 0 }}>明度</span>
              <input
                type="range" min="0" max="100" value={hsl.l}
                className="ce-slider"
                style={{ background: litGradient }}
                onChange={e => applyHSL({ ...hsl, l: +e.target.value })}
              />
            </div>

          </div>
        )}

        {/* Complete button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => onComplete(items)}
            style={{
              padding: '12px 32px', borderRadius: 30, border: 'none',
              cursor: 'pointer', fontSize: 14, fontWeight: 700,
              background: isLight ? '#1a1a1a' : 'white',
              color:      isLight ? 'white'    : '#1a1a1a',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            }}
          >完了</button>
        </div>

      </div>

    </div>
  )
}
