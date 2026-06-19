'use client'

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { formatHashtag } from '@/app/onboarding/garden-setup/garden-visuals'
import DaisyTopView from '@/src/components/garden/DaisyTopView'
import SeedTopView from '@/src/components/garden/SeedTopView'
import { GRASS_FIELD_BG, SHADOW_FIELD_BG, DAISY_SIZE, SEED_SIZE } from '@/src/components/garden/gardenColors'
import GrowthTransitionOverlay from '@/src/components/tree/GrowthTransitionOverlay'
import { useGrowthStage } from '@/src/components/tree/useGrowthStage'

type Tag = { id: string; text: string }
type TagPosition = { id: string; text: string; cx: number; cy: number }

const DRAG_THRESHOLD = 6

// cx/cy はバブル「中心」座標。重複は考慮しないため、初期配置のまま確定すると
// 重なる可能性がある（その場合は garden-display.tsx 側の generatePositions が
// 次回表示時に検出し、重ならない位置へ再配置してDBへ書き戻す）。
function initPositions(tags: Tag[]): TagPosition[] {
  return tags.map((tag, index) => ({
    id: tag.id,
    text: tag.text,
    cx: 60 + (index * 97 + 30) % 250,
    cy: 80 + (index * 73 + 20) % 350,
  }))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

// DBの position_x/position_y は「バブル中心座標」(cx, cy) として保存する。
// garden-display.tsx の generatePositions もこの意味で読み取る。
async function savePositions(positions: TagPosition[]) {
  await Promise.all(
    positions.map(p =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('tags') as any).update({ position_x: p.cx, position_y: p.cy }).eq('id', p.id)
    )
  )
}

type GardenSetupFlowProps = {
  lightTags: Tag[]
  shadowTags: Tag[]
  onComplete?: () => void
}

// 農園セットアップフロー：実の部屋（光タグ）→ 根の部屋（影タグ）の2段階配置編集
export default function GardenSetupFlow({ lightTags, shadowTags, onComplete }: GardenSetupFlowProps) {
  const router = useRouter()
  const { setGrowthStage } = useGrowthStage()
  const [step, setStep] = useState<1 | 2>(1)
  const [lightPositions, setLightPositions] = useState<TagPosition[]>(() => initPositions(lightTags))
  const [shadowPositions, setShadowPositions] = useState<TagPosition[]>(() => initPositions(shadowTags))
  const [saving, setSaving] = useState(false)
  const [showGrowthAnimation, setShowGrowthAnimation] = useState(false)

  const fieldRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number; startCx: number; startCy: number; moved: boolean } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const isStep1 = step === 1
  const positions = isStep1 ? lightPositions : shadowPositions
  const setPositions = isStep1 ? setLightPositions : setShadowPositions

  // ドラッグ中のポインタ移動・離上をwindowで監視（要素外に出ても追従させる）
  useEffect(() => {
    if (!draggingId) return
    const field = fieldRef.current
    if (!field) return
    const rect = field.getBoundingClientRect()

    const handleMove = (e: globalThis.PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) drag.moved = true
      if (!drag.moved) return
      const newCx = clamp(drag.startCx + dx, 0, rect.width)
      const newCy = clamp(drag.startCy + dy, 0, rect.height)
      setPositions(prev => prev.map(p => (p.id === drag.id ? { ...p, cx: newCx, cy: newCy } : p)))
    }

    const handleUp = () => {
      dragRef.current = null
      setDraggingId(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [draggingId, setPositions])

  const handlePointerDown = (tag: TagPosition) => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragRef.current = { id: tag.id, startX: e.clientX, startY: e.clientY, startCx: tag.cx, startCy: tag.cy, moved: false }
    setDraggingId(tag.id)
  }

  const handleDeleteItem = (id: string) => {
    setPositions(prev => prev.filter(p => p.id !== id))
  }

  const handleStep1Confirm = async () => {
    setSaving(true)
    await savePositions(lightPositions)
    setSaving(false)
    setStep(2)
  }

  const handleStep2Confirm = async () => {
    setSaving(true)
    await savePositions(shadowPositions)
    setSaving(false)
    setGrowthStage('bud')
    setShowGrowthAnimation(true)
  }

  const handleGrowthAnimationNext = () => {
    if (onComplete) onComplete()
    else router.push('/home')
  }

  const itemSize = isStep1 ? Math.round(DAISY_SIZE * 0.7) : SEED_SIZE
  const fieldBg = isStep1 ? GRASS_FIELD_BG : SHADOW_FIELD_BG

  // 農園確定後：植えたタネから芽が出て育つ成長アニメーションを全画面表示
  if (showGrowthAnimation) {
    return (
      <GrowthTransitionOverlay
        stage="bud"
        quote={{ text: '自分の内側を見よ。\nあらゆる善の源泉はそこにある。', author: 'マルクス・アウレリウス' }}
        message={{ title: '自分の姿を、ちゃんと見つめたね。', titleSize: 16, subtitle: 'あなたの心はあなたにしか描けないアートになる' }}
        buttonText="次へ"
        onNext={handleGrowthAnimationNext}
      />
    )
  }

  return (
    <div
      className="flex flex-col px-6 pt-12"
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
        overflowY: 'auto', paddingBottom: 80,
      }}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-1" style={{ flexShrink: 0 }}>
        <h1 className="text-xl font-bold" style={{ color: '#3B2F1E' }}>
          {isStep1 ? '🌻 実の畑を整えよう' : '🌱 根の畑を整えよう'}
        </h1>
        <span className="text-sm font-bold" style={{ color: 'rgba(59,47,30,0.5)' }}>
          {step} / 2
        </span>
      </div>
      <p className="text-sm mb-4" style={{ color: 'rgba(59,47,30,0.55)', flexShrink: 0 }}>
        {isStep1 ? 'デイジーを動かして、自分だけの花畑を作ろう' : 'タネを動かして、自分の根っこを配置しよう'}
      </p>

      {/* 配置エリア：ボトムナビが出てくる位置まで画面下端いっぱいに広げる */}
      <div
        ref={fieldRef}
        style={{
          position: 'relative',
          marginLeft: -24, marginRight: -24,
          flex: 1,
          background: fieldBg,
          overflow: 'hidden',
        }}
      >
        {positions.length === 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%', padding: '0 32px',
            color: '#8B6914', fontSize: 14, textAlign: 'center',
          }}>
            <p style={{ margin: 0 }}>
              {isStep1 ? '光タグ' : '影タグ'}が登録されていません
            </p>
            <p style={{ fontSize: 12, margin: '8px 0 0' }}>
              先にオンボーディングでハッシュタグを登録してください
            </p>
          </div>
        )}
        {positions.map(pos => (
          isStep1 ? (
            <DaisyTopView
              key={pos.id}
              cx={pos.cx} cy={pos.cy} size={itemSize}
              label={formatHashtag(pos.text)}
              onPointerDown={handlePointerDown(pos)}
              onDelete={() => handleDeleteItem(pos.id)}
            />
          ) : (
            <SeedTopView
              key={pos.id}
              cx={pos.cx} cy={pos.cy} size={itemSize}
              label={formatHashtag(pos.text)}
              onPointerDown={handlePointerDown(pos)}
              onDelete={() => handleDeleteItem(pos.id)}
            />
          )
        ))}
      </div>

      {/* 下部固定ボタン：本来のボトムナビ（高さ80px）と同じ範囲に収める */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 390, zIndex: 100,
          background: '#F5F0E8', padding: '12px 24px',
          height: 80, boxSizing: 'border-box',
          display: 'flex', alignItems: 'center',
        }}
      >
        <button
          onClick={isStep1 ? handleStep1Confirm : handleStep2Confirm}
          disabled={saving}
          className="w-full h-full rounded-xl text-base font-bold flex items-center justify-center"
          style={{
            background: '#4A7C59', color: '#F5F0E8', border: 'none',
            cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
          }}
        >
          {isStep1 ? 'この配置でOK →' : 'ガーデンを確定する'}
        </button>
      </div>
    </div>
  )
}
