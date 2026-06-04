'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'

// 初期配置用座標（fraction 0–1）
const SPREAD = [
  { x: 0.14, y: 0.14 }, { x: 0.55, y: 0.11 }, { x: 0.22, y: 0.34 },
  { x: 0.64, y: 0.32 }, { x: 0.10, y: 0.54 }, { x: 0.50, y: 0.56 },
  { x: 0.20, y: 0.74 }, { x: 0.66, y: 0.70 }, { x: 0.38, y: 0.84 },
]

// ── インラインタグ追加フォーム ────────────────────────────────────────────────

function AddTagForm({
  variant,
  onAdd,
  onClose,
}: {
  variant: 'light' | 'shadow'
  onAdd: (tag: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const commit = () => {
    const trimmed = value.trim().replace(/^#+/, '')   // 先頭の # を除去
    if (!trimmed) { onClose(); return }
    onAdd(`#${trimmed}`)
    setValue('')
    onClose()
  }

  const isLight = variant === 'light'

  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-sm" style={{ color: isLight ? '#666' : 'rgba(255,255,255,0.45)' }}>#</span>
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') onClose()
        }}
        placeholder="タグを入力"
        className="flex-1 px-3 py-1.5 rounded-full text-sm outline-none"
        style={{
          background: isLight ? 'white' : 'rgba(255,255,255,0.12)',
          color:      isLight ? '#1a1a1a' : 'white',
          border:     isLight ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.2)',
        }}
      />
      <button
        onClick={commit}
        className="px-3 py-1.5 rounded-full text-sm font-medium flex-shrink-0"
        style={{
          background: isLight ? '#1a1a1a' : 'white',
          color:      isLight ? 'white'   : '#1a1a1a',
        }}
      >
        追加
      </button>
      <button
        onClick={onClose}
        className="text-sm"
        style={{ color: isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)' }}
      >
        ✕
      </button>
    </div>
  )
}

// ── メインページ ────────────────────────────────────────────────────────────────

export default function CompletePage() {
  const router = useRouter()
  const [lightTags,       setLightTags]       = useState<string[]>([])
  const [shadowTags,      setShadowTags]      = useState<string[]>([])
  const [addingLight,     setAddingLight]     = useState(false)
  const [addingShadow,    setAddingShadow]    = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('onboarding_tags')
    if (!raw) return
    const { lightTags: l, shadowTags: s } = JSON.parse(raw) as {
      lightTags: string[]
      shadowTags: string[]
    }
    setLightTags(l ?? [])
    setShadowTags(s ?? [])
  }, [])

  const removeLightTag  = (tag: string) => setLightTags(prev  => prev.filter(t => t !== tag))
  const removeShadowTag = (tag: string) => setShadowTags(prev => prev.filter(t => t !== tag))

  const addLightTag  = (tag: string) => setLightTags(prev  => prev.includes(tag) ? prev : [...prev, tag])
  const addShadowTag = (tag: string) => setShadowTags(prev => prev.includes(tag) ? prev : [...prev, tag])

  const handleRegister = async () => {
    sessionStorage.setItem('onboarding_tags', JSON.stringify({ lightTags, shadowTags }))

    const userId = sessionStorage.getItem('user_id')
    if (userId) {
      const allTags = [
        ...lightTags.map((text, i) => ({
          user_id:     userId,
          text,
          type:        'light' as const,
          color:       '#6d28d9',
          position_x:  SPREAD[i % SPREAD.length].x,
          position_y:  SPREAD[i % SPREAD.length].y,
        })),
        ...shadowTags.map((text, i) => ({
          user_id:     userId,
          text,
          type:        'shadow' as const,
          color:       '#a78bfa',
          position_x:  SPREAD[i % SPREAD.length].x,
          position_y:  SPREAD[i % SPREAD.length].y,
        })),
      ]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('tags').insert(allTags as any)
      if (error) console.error('tags save failed:', error.message)
    }

    router.push('/onboarding/canvas-light')
  }

  return (
    <div
      className="flex flex-col"
      style={{ minHeight: '100svh', maxWidth: 390, margin: '0 auto' }}
    >

      {/* ── 光エリア ──────────────────────────────────────── */}
      <div
        className="flex-1 px-6 pt-10 pb-6 flex flex-col"
        style={{ background: '#FFFDF5' }}
      >
        <div className="flex items-center gap-2 mb-5">
          <span className="text-2xl">☀️</span>
          <span className="text-base font-semibold" style={{ color: '#1a1a1a' }}>光の自分</span>
        </div>

        <div className="flex flex-wrap gap-2 content-start mb-4">
          {lightTags.length === 0 && !addingLight && (
            <p className="text-sm w-full" style={{ color: '#bbb' }}>タグがありません</p>
          )}
          {lightTags.map(tag => (
            <button
              key={tag}
              onClick={() => removeLightTag(tag)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-opacity hover:opacity-70"
              style={{ background: 'rgba(0,0,0,0.08)', color: '#1a1a1a' }}
            >
              {tag}
              <span className="text-xs opacity-40 ml-0.5">×</span>
            </button>
          ))}
        </div>

        {addingLight ? (
          <AddTagForm
            variant="light"
            onAdd={addLightTag}
            onClose={() => setAddingLight(false)}
          />
        ) : (
          <button
            onClick={() => setAddingLight(true)}
            className="self-start flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-opacity hover:opacity-70"
            style={{ color: '#888', border: '1px dashed #ccc' }}
          >
            <span className="text-base leading-none">+</span> タグを追加
          </button>
        )}
      </div>

      {/* ── グラデーション境界 ──────────────────────────── */}
      <div
        style={{
          height: 40,
          background: 'linear-gradient(to bottom, #FFFDF5, #1a1a2e)',
          flexShrink: 0,
        }}
      />

      {/* ── 影エリア ──────────────────────────────────────── */}
      <div
        className="flex-1 px-6 pt-4 pb-6 flex flex-col"
        style={{ background: '#1a1a2e' }}
      >
        <div className="flex items-center gap-2 mb-5">
          <span className="text-2xl">🌙</span>
          <span className="text-base font-semibold text-white">影の自分</span>
        </div>

        <div className="flex flex-wrap gap-2 content-start mb-4">
          {shadowTags.length === 0 && !addingShadow && (
            <p className="text-sm text-white/30 w-full">タグがありません</p>
          )}
          {shadowTags.map(tag => (
            <button
              key={tag}
              onClick={() => removeShadowTag(tag)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-opacity hover:opacity-70"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}
            >
              {tag}
              <span className="text-xs opacity-40 ml-0.5">×</span>
            </button>
          ))}
        </div>

        {addingShadow ? (
          <AddTagForm
            variant="shadow"
            onAdd={addShadowTag}
            onClose={() => setAddingShadow(false)}
          />
        ) : (
          <button
            onClick={() => setAddingShadow(true)}
            className="self-start flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-opacity hover:opacity-70"
            style={{ color: 'rgba(255,255,255,0.4)', border: '1px dashed rgba(255,255,255,0.2)' }}
          >
            <span className="text-base leading-none">+</span> タグを追加
          </button>
        )}
      </div>

      {/* ── 登録ボタン ────────────────────────────────────── */}
      <div
        className="px-6 py-5 flex-shrink-0"
        style={{ background: '#1a1a2e', borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button
          onClick={handleRegister}
          className="w-full py-4 rounded-full text-sm font-semibold bg-white text-black transition-opacity active:opacity-70"
        >
          登録する
        </button>
      </div>

    </div>
  )
}
