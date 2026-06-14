'use client'

import { useState } from 'react'
import GardenDisplay from './garden-display'
import { BottomNav } from '@/src/components/BottomNav'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import RoomNavArrow from '@/src/components/tutorial/RoomNavArrow'
import GrowthTree from '@/src/components/tree/GrowthTree'
import { useGrowthStage, GROWTH_STAGE_LABELS } from '@/src/components/tree/useGrowthStage'

export default function HomePage() {
  const { step, advanceStep } = useTutorialStep()
  const { stage } = useGrowthStage()

  // チュートリアル：ルーム誘導の矢印案内の前に表示する案内ポップアップ
  const [roomGuideDismissed, setRoomGuideDismissed] = useState(false)

  return (
    <div
      className="min-h-screen"
      style={{ background: '#F5F0E8', maxWidth: 390, margin: '0 auto', position: 'relative' }}
    >
      {/* ────────────────── ヘッダー ────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '44px 20px 12px',
      }}>
        <h1 style={{ fontSize: 19, fontWeight: 600, color: '#3B2F1E', margin: 0 }}>
          あなたの農園
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <GrowthTree stage={stage} size={28} />
          <span style={{ fontSize: 11, color: '#8B6914', fontWeight: 600 }}>
            {GROWTH_STAGE_LABELS[stage]}
          </span>
        </div>
      </div>

      {/* ────────────────── 農園表示 ────────────────── */}
      {/* paddingBottom: ボトムナビの高さ(80px) + 余裕分(40px) */}
      <div style={{ paddingBottom: 120 }}>
        <GardenDisplay />
      </div>

      <BottomNav onRoomClick={() => { if (step === 'room_nav_arrow') advanceStep('room_intro') }} />

      {step === 'room_nav_arrow' && roomGuideDismissed && <RoomNavArrow />}

      {/* ────────────────── チュートリアル：ルーム誘導前の案内ポップアップ ────────────────── */}
      {step === 'room_nav_arrow' && !roomGuideDismissed && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 24px',
          }}
        >
          <div style={{
            width: '100%', maxWidth: 340, background: '#FFFFFF', borderRadius: 20,
            padding: 32, textAlign: 'center',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#3B2F1E', margin: 0 }}>
              同じタネを持つ人がいる場所へ✨
            </h2>
            <button
              onClick={() => setRoomGuideDismissed(true)}
              style={{
                width: '100%', padding: '14px', marginTop: 24,
                borderRadius: 24, border: 'none',
                background: '#4A7C59', color: '#FFFFFF',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >
              のぞいてみる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
