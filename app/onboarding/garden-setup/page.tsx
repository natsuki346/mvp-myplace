'use client'

import { useState, useEffect, useRef } from 'react'
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  MouseEvent as ReactMouseEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import {
  STORAGE_KEY,
  colorForTag,
  formatHashtag,
  useMounted,
  loadGardenData,
  TreeSVG,
  RootsSVG,
  RootNodeView,
  MaterialIcon,
} from './garden-visuals'
import type { MaterialType, PlantTag, RootNode } from './garden-visuals'

// ─────────────────────────────────────────────────────────────────────────────
//  型
// ─────────────────────────────────────────────────────────────────────────────

type MaterialOption = {
  type: MaterialType
  label: string
}

const MATERIAL_OPTIONS: MaterialOption[] = [
  { type: 'tomato',    label: 'トマト' },
  { type: 'apple',     label: 'りんご' },
  { type: 'grape',     label: 'ぶどう' },
  { type: 'lemon',     label: 'レモン' },
  { type: 'sunflower', label: 'ひまわり' },
  { type: 'rose',      label: 'バラ' },
  { type: 'dandelion', label: 'タンポポ' },
  { type: 'leaf',      label: '葉' },
  { type: 'vine',      label: 'つる' },
]

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

// 地下エリアで根タグを表示する初期位置（幹から左右交互に伸びる）
const ROOT_SLOTS: { x: number; y: number }[] = [
  { x: 30, y: 14 }, { x: 70, y: 14 },
  { x: 16, y: 34 }, { x: 84, y: 34 },
  { x: 10, y: 56 }, { x: 90, y: 56 },
  { x: 22, y: 80 }, { x: 78, y: 80 },
]

// 木の枝周辺に重ならないようランダムな位置を求める
function randomFloatPosition(occupied: { x: number; y: number }[]): { x: number; y: number } {
  const minDist = 14
  for (let attempt = 0; attempt < 40; attempt++) {
    const x = 8 + Math.random() * 84
    const y = 6 + Math.random() * 50
    if (occupied.every(p => Math.hypot(p.x - x, p.y - y) >= minDist)) {
      return { x, y }
    }
  }
  return { x: 8 + Math.random() * 84, y: 6 + Math.random() * 50 }
}

// ─────────────────────────────────────────────────────────────────────────────
//  ボタンスタイル / ステップピル
// ─────────────────────────────────────────────────────────────────────────────

function btnStyle(active: boolean, color = '#4A7C59'): CSSProperties {
  return {
    width: '100%', padding: '16px',
    borderRadius: 30, border: 'none',
    background: active ? color : 'rgba(139,115,85,0.18)',
    color: active ? '#ffffff' : 'rgba(91,74,53,0.5)',
    fontSize: 15, fontWeight: 700,
    cursor: active ? 'pointer' : 'default',
    boxShadow: active ? `0 4px 16px ${color}55` : 'none',
    transition: 'background 0.3s ease, color 0.3s ease, box-shadow 0.3s ease',
  }
}

function StepPill({ label, active, color }: { label: string; active: boolean; color: string }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '7px 4px',
      borderRadius: 24,
      background: active ? color : 'transparent',
      color: active ? '#fff' : '#A08050',
      border: `1.5px solid ${active ? color : 'rgba(160,128,80,0.3)'}`,
      fontSize: 11, fontWeight: 600,
      transition: 'all 0.35s ease',
    }}>
      {label}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  メインページ
// ─────────────────────────────────────────────────────────────────────────────

export default function GardenSetupPage() {
  const router = useRouter()

  const [step, setStep] = useState<1 | 2>(1)

  // localStorage から読み込んだ配置データは SSR 時と内容が異なるため、
  // マウント完了後にのみそれらに依存する描画を行う
  const mounted = useMounted()

  // STEP1: 実タグ（木に浮かぶ・配置済み）
  const [plantTags, setPlantTags] = useState<PlantTag[]>(() => loadGardenData().tags)
  const [activeTagId, setActiveTagId] = useState<string | null>(null)

  // STEP2: 根タグ・根ノード
  const [registeredRootTags, setRegisteredRootTags] = useState<{ id: string | number; text: string }[]>([])
  const [rootNodes, setRootNodes] = useState<RootNode[]>(() => loadGardenData().roots)
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null)
  const [rootInput, setRootInput] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const aboveRef = useRef<HTMLDivElement>(null)
  const underRef = useRef<HTMLDivElement>(null)
  const dragInfo = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null)
  const tagDragInfo = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null)
  const lastTapRef = useRef<{ id: string; time: number } | null>(null)

  // ── 配置データを localStorage に保存（STEP1 + STEP2 まとめて） ──────────
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tags: plantTags, roots: rootNodes }))
  }, [plantTags, rootNodes])

  // ── 登録済み実タグ（type='light'）を Supabase から取得し、木の枝周辺に浮かべる ──
  useEffect(() => {
    const userId = sessionStorage.getItem('user_id')
    if (!userId) return

    supabase
      .from('tags')
      .select('id, text')
      .eq('user_id', userId)
      .eq('type', 'light')
      .then(({ data, error }) => {
        if (error || !data) return
        setPlantTags(prev => {
          const existingIds = new Set(prev.map(t => t.id))
          const occupied = prev.map(t => ({ x: t.x, y: t.y }))
          const additions: PlantTag[] = []
          for (const row of data) {
            const id = `tag-${row.id}`
            if (existingIds.has(id)) continue
            const pos = randomFloatPosition(occupied)
            occupied.push(pos)
            additions.push({ id, tag: row.text, type: null, x: pos.x, y: pos.y })
          }
          return additions.length ? [...prev, ...additions] : prev
        })
      })
  }, [])

  // ── 登録済み根タグ（type='shadow'）を Supabase から取得 ───────────────
  useEffect(() => {
    const userId = sessionStorage.getItem('user_id')
    if (!userId) return

    supabase
      .from('tags')
      .select('id, text')
      .eq('user_id', userId)
      .eq('type', 'shadow')
      .then(({ data, error }) => {
        if (error || !data) return
        setRegisteredRootTags(data.map((row: { id: string | number; text: string }) => ({ id: row.id, text: row.text })))

        // 登録済み根タグを「幹から伸びる根」として初期配置
        setRootNodes(prev => {
          const existingTopTags = new Set(prev.filter(n => n.parentId === null).map(n => n.tag))
          const additions: RootNode[] = []
          let slotIdx = prev.filter(n => n.parentId === null).length
          for (const t of data) {
            if (existingTopTags.has(t.text)) continue
            const slot = ROOT_SLOTS[slotIdx % ROOT_SLOTS.length]
            additions.push({ id: `root-tag-${t.id}`, label: t.text, tag: t.text, parentId: null, x: slot.x, y: slot.y })
            slotIdx++
          }
          return additions.length ? [...prev, ...additions] : prev
        })
      })
  }, [])

  // ── STEP切り替え時に地上⇔地下へスムーズスクロール ──────────────────────
  useEffect(() => {
    const scrollEl = scrollRef.current
    const aboveEl = aboveRef.current
    if (!scrollEl || !aboveEl) return
    scrollEl.scrollTo({ top: step === 2 ? aboveEl.offsetHeight : 0, behavior: 'smooth' })
  }, [step])

  const allRootTagsPlaced = registeredRootTags.every(t =>
    rootNodes.some(n => n.parentId === null && n.tag === t.text)
  )
  const activeTag = plantTags.find(t => t.id === activeTagId) ?? null

  // ── タグのドラッグ開始（マウス／タッチ共通） ──────────────────────────
  const handleTagDragStart = (id: string, clientX: number, clientY: number) => {
    tagDragInfo.current = { id, startX: clientX, startY: clientY, moved: false }
  }

  // ── タグのドラッグ追従・配置確定（window にマウス／タッチを購読） ─────
  useEffect(() => {
    const moveTagTo = (clientX: number, clientY: number) => {
      const info = tagDragInfo.current
      if (!info || !aboveRef.current) return

      const dx = clientX - info.startX
      const dy = clientY - info.startY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) info.moved = true
      if (!info.moved) return

      const rect = aboveRef.current.getBoundingClientRect()
      const x = clamp(((clientX - rect.left) / rect.width) * 100, 2, 98)
      const y = clamp(((clientY - rect.top) / rect.height) * 100, 2, 98)
      setPlantTags(prev => prev.map(t => (t.id === info.id ? { ...t, x, y } : t)))
    }

    const onMouseMove = (e: MouseEvent) => moveTagTo(e.clientX, e.clientY)
    const onMouseUp = () => { tagDragInfo.current = null }
    const onTouchMove = (e: TouchEvent) => {
      const info = tagDragInfo.current
      const touch = e.touches[0]
      if (!info || !touch) return
      if (info.moved) e.preventDefault()
      moveTagTo(touch.clientX, touch.clientY)
    }
    const onTouchEnd = () => { tagDragInfo.current = null }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  // ── 浮いているタグをタップ → 素材選択シートを開く ─────────────────────
  const handleFloatingTagClick = (e: ReactMouseEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation()
    const info = tagDragInfo.current
    tagDragInfo.current = null
    if (info?.moved) return
    setActiveTagId(id)
  }

  // ── 配置済みタグをダブルタップ → 素材選択に戻る ───────────────────────
  const handlePlacedTagClick = (e: ReactMouseEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation()
    const now = Date.now()
    const info = tagDragInfo.current
    tagDragInfo.current = null
    if (info?.moved) return

    const last = lastTapRef.current
    if (last && last.id === id && now - last.time < 300) {
      setActiveTagId(id)
      lastTapRef.current = null
    } else {
      lastTapRef.current = { id, time: now }
    }
  }

  // ── 素材選択シートで植物を選ぶ ────────────────────────────────────────
  const handleAssignMaterial = (type: MaterialType) => {
    if (!activeTagId) return
    setPlantTags(prev => prev.map(t => (t.id === activeTagId ? { ...t, type } : t)))
    setActiveTagId(null)
  }

  const closeMaterialSheet = () => setActiveTagId(null)

  // ── STEP1 → STEP2 ────────────────────────────────────────────────────
  const handleNextStep = () => {
    setStep(2)
  }

  // ── 根ノードのドラッグで方向・長さを調整 ─────────────────────────────
  const handleRootPointerDown = (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragInfo.current = { id, startX: e.clientX, startY: e.clientY, moved: false }
  }

  const handleRootPointerMove = (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    const info = dragInfo.current
    if (!info || info.id !== id || !underRef.current) return

    const dx = e.clientX - info.startX
    const dy = e.clientY - info.startY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) info.moved = true
    if (!info.moved) return

    const rect = underRef.current.getBoundingClientRect()
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 2, 98)
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 2, 98)
    setRootNodes(prev => prev.map(node => (node.id === id ? { ...node, x, y } : node)))
  }

  const handleRootPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
  }

  // ── 根ノードをタップして入力欄を開閉 ─────────────────────────────────
  const handleRootClick = (e: ReactMouseEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation()
    const info = dragInfo.current
    dragInfo.current = null
    if (info?.moved) return

    setSelectedRootId(prev => (prev === id ? null : id))
    setRootInput('')
  }

  // ── 何もない場所をタップしたら入力欄を閉じる ─────────────────────────
  const handleUnderAreaClick = () => {
    setSelectedRootId(null)
    setRootInput('')
  }

  // ── Enterで子ノードとして根を伸ばす ──────────────────────────────────
  const handleRootInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const text = rootInput.trim()
    if (!text || !selectedRootId) return

    const parent = rootNodes.find(n => n.id === selectedRootId)
    if (!parent) return

    const dir = parent.x < 50 ? -1 : 1
    const newNode: RootNode = {
      id: `root-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: text,
      parentId: parent.id,
      x: clamp(parent.x + dir * 9, 4, 96),
      y: clamp(parent.y + 11, 4, 98),
    }
    setRootNodes(prev => [...prev, newNode])
    setRootInput('')
    setSelectedRootId(newNode.id)
  }

  // ── 「農園を完成させる」→ /home へ ───────────────────────────────────
  const handleComplete = () => {
    if (!allRootTagsPlaced) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tags: plantTags, roots: rootNodes }))
    localStorage.setItem('whyme_tutorial_step', 'process_mapping')
    router.push('/process-map?step=3')
  }

  return (
    <div style={{
      height: '100svh',
      maxWidth: 390, margin: '0 auto',
      background: '#F5F0E8',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <style>{`
        .gs-scroll::-webkit-scrollbar { display: none; }
        .gs-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ────────────────── ヘッダー ────────────────── */}
      <div style={{ flexShrink: 0, padding: '44px 20px 12px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <StepPill label="① 木を飾る" active={step === 1} color="#4A7C59" />
          <StepPill label="② 根っこを埋める" active={step === 2} color="#8B6914" />
        </div>
        <h1 style={{ fontSize: 19, fontWeight: 600, color: '#3B2F1E', margin: '0 0 3px' }}>
          {step === 1 ? '木を飾りましょう' : '根っこを埋めましょう'}
        </h1>
        <p style={{ fontSize: 12, color: '#8B7355', margin: 0 }}>
          {step === 1 ? '果実や花で、あなたの木を彩ってください' : 'あなたの内側にある言葉を、深く植えていく'}
        </p>
      </div>

      {/* ────────────────── 農園エリア（地上 → 地下） ────────────────── */}
      <div ref={scrollRef} className="gs-scroll" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {/* 地上エリア（STEP1） */}
        <div
          ref={aboveRef}
          style={{
            position: 'relative', width: '100%', aspectRatio: '390 / 600', overflow: 'hidden',
            opacity: step === 1 ? 1 : 0.4, transition: 'opacity 0.5s ease',
            pointerEvents: step === 1 ? 'auto' : 'none',
          }}
        >
          <TreeSVG />

          {mounted && plantTags.map(tag => tag.type === null ? (
            <div
              key={tag.id}
              onMouseDown={(e) => { e.stopPropagation(); handleTagDragStart(tag.id, e.clientX, e.clientY) }}
              onTouchStart={(e) => {
                e.stopPropagation()
                const touch = e.touches[0]
                if (touch) handleTagDragStart(tag.id, touch.clientX, touch.clientY)
              }}
              onClick={(e) => handleFloatingTagClick(e, tag.id)}
              style={{
                position: 'absolute',
                left: `${tag.x}%`,
                top: `${tag.y}%`,
                transform: 'translate(-50%, -50%)',
                touchAction: 'none',
                cursor: 'grab',
                zIndex: 2,
              }}
            >
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#5A4A35',
                background: 'rgba(255,255,255,0.85)',
                border: `1.5px dashed ${colorForTag(tag.tag)}`,
                borderRadius: 999, padding: '4px 10px', whiteSpace: 'nowrap',
              }}>
                {formatHashtag(tag.tag)}
              </span>
            </div>
          ) : (
            <div
              key={tag.id}
              onMouseDown={(e) => { e.stopPropagation(); handleTagDragStart(tag.id, e.clientX, e.clientY) }}
              onTouchStart={(e) => {
                e.stopPropagation()
                const touch = e.touches[0]
                if (touch) handleTagDragStart(tag.id, touch.clientX, touch.clientY)
              }}
              onClick={(e) => handlePlacedTagClick(e, tag.id)}
              style={{
                position: 'absolute',
                left: `${tag.x}%`,
                top: `${tag.y}%`,
                transform: 'translate(-50%, -50%)',
                touchAction: 'none',
                cursor: 'grab',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                zIndex: 2,
              }}
            >
              <MaterialIcon type={tag.type} size={36} />
              <span style={{
                fontSize: 9, color: '#fff', background: colorForTag(tag.tag),
                borderRadius: 6, padding: '1px 5px', marginTop: 2, whiteSpace: 'nowrap',
              }}>
                {formatHashtag(tag.tag)}
              </span>
            </div>
          ))}
        </div>

        {/* 地下エリア（STEP2） */}
        <div
          ref={underRef}
          onClick={handleUnderAreaClick}
          style={{
            position: 'relative', width: '100%', aspectRatio: '390 / 480', overflow: 'hidden',
            opacity: step === 2 ? 1 : 0.4, transition: 'opacity 0.5s ease',
            pointerEvents: step === 2 ? 'auto' : 'none',
          }}
        >
          <RootsSVG rootNodes={rootNodes} mounted={mounted} />

          {mounted && rootNodes.map(node => (
            <RootNodeView
              key={node.id}
              node={node}
              selected={selectedRootId === node.id}
              onPointerDown={(e) => handleRootPointerDown(e, node.id)}
              onPointerMove={(e) => handleRootPointerMove(e, node.id)}
              onPointerUp={handleRootPointerUp}
              onClick={(e) => handleRootClick(e, node.id)}
            />
          ))}
        </div>
      </div>

      {/* ────────────────── 下部パネル ────────────────── */}
      <div style={{
        flexShrink: 0, borderTop: '1px solid rgba(139,115,85,0.15)',
        minHeight: 64, display: 'flex', alignItems: 'center',
        padding: '12px 16px',
      }}>
        {step === 1 ? (
          <p style={{ fontSize: 12, color: '#A08050', margin: 0, textAlign: 'center', width: '100%' }}>
            木についたタグをタップして、飾る植物を選びましょう
          </p>
        ) : selectedRootId ? (
          <input
            autoFocus
            value={rootInput}
            onChange={(e) => setRootInput(e.target.value)}
            onKeyDown={handleRootInputKeyDown}
            placeholder="関連する感情・悩みを追加"
            style={{
              flex: 1, padding: '11px 16px', borderRadius: 999,
              border: '1px solid rgba(139,105,20,0.3)', background: '#fff',
              fontSize: 13, color: '#3B2F1E', outline: 'none',
            }}
          />
        ) : (
          <p style={{ fontSize: 12, color: '#A08050', margin: 0, textAlign: 'center', width: '100%' }}>
            根のタグをタップして、感情や悩みの言葉を追加できます
          </p>
        )}
      </div>

      {/* ────────────────── ボタン ────────────────── */}
      <div style={{ flexShrink: 0, padding: '16px 20px 44px' }}>
        {step === 1 ? (
          <button onClick={handleNextStep} style={btnStyle(true, '#4A7C59')}>
            根っこを埋めに行く →
          </button>
        ) : (
          <button onClick={handleComplete} disabled={!allRootTagsPlaced} style={btnStyle(allRootTagsPlaced, '#8B6914')}>
            農園を完成させる →
          </button>
        )}
      </div>

      {/* ────────────────── 素材選択シート ────────────────── */}
      {activeTag && (
        <div
          onClick={closeMaterialSheet}
          style={{
            position: 'absolute', inset: 0, zIndex: 50,
            background: 'rgba(59,47,30,0.4)',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', background: '#F5F0E8',
              borderRadius: '20px 20px 0 0',
              padding: '20px 20px 36px',
              boxShadow: '0 -8px 24px rgba(0,0,0,0.15)',
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: '#3B2F1E', margin: '0 0 4px', textAlign: 'center' }}>
              どの植物として飾りますか？
            </p>
            <p style={{ fontSize: 11, color: '#8B7355', margin: '0 0 16px', textAlign: 'center' }}>
              {formatHashtag(activeTag.tag)}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {MATERIAL_OPTIONS.map(opt => {
                const selected = activeTag.type === opt.type
                return (
                  <button
                    key={opt.type}
                    onClick={() => handleAssignMaterial(opt.type)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: '12px 8px',
                      borderRadius: 14,
                      border: selected ? '2px solid #4A7C59' : '2px solid transparent',
                      background: selected ? 'rgba(74,124,89,0.12)' : 'rgba(139,115,85,0.08)',
                      cursor: 'pointer',
                    }}
                  >
                    <MaterialIcon type={opt.type} size={36} />
                    <span style={{ fontSize: 11, color: '#5A4A35' }}>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
