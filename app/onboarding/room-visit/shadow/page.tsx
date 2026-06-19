'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RoomCardList from '@/app/room/RoomCardList'
import GrowthTransitionOverlay from '@/src/components/tree/GrowthTransitionOverlay'
import WhyModal from '@/src/components/onboarding/WhyModal'
import GardenDisplay from '@/app/home/garden-display'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'

export default function ShadowRoomVisitPage() {
  const router = useRouter()
  const { advanceStep } = useTutorialStep()
  const [showAnimation, setShowAnimation] = useState(false)
  const [showWhyModal, setShowWhyModal] = useState(false)
  const [showGardenPreview, setShowGardenPreview] = useState(false)

  const handleEnterMainApp = () => {
    advanceStep('room_chat_mi')
    router.push('/home')
  }

  return (
    <>
      <div
        style={{
          minHeight: '100svh', paddingTop: 48, paddingBottom: 120,
          paddingLeft: 24, paddingRight: 24,
          background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 22 }}>🌱</span>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#3B2F1E', margin: 0 }}>Seed</h1>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.55)', marginBottom: 28, marginTop: 0 }}>
          タグを選んで入室してみよう
        </p>

        <RoomCardList type="shadow" />

        {/* 次へボタン */}
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 390,
          padding: '16px 24px 32px',
          background: 'linear-gradient(to bottom, transparent, #F5F0E8 40%)',
        }}>
          <button
            onClick={() => setShowAnimation(true)}
            style={{
              width: '100%', padding: '14px', borderRadius: 24, border: 'none',
              background: '#4A7C59', color: '#FFFFFF',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            次へ
          </button>
        </div>
      </div>

      {/* ステップ12: 「繋がれたね！」チェックアニメーション */}
      {showAnimation && (
        <GrowthTransitionOverlay
          stage="bud"
          message={{ title: '繋がれたね！🤝' }}
          onNext={() => { setShowAnimation(false); setShowWhyModal(true) }}
        />
      )}

      {/* ステップ13: プロセスモーダル③「向き合い成長する・次ここ」 */}
      {showWhyModal && (
        <WhyModal
          currentStep={3}
          onStart={() => { setShowWhyModal(false); setShowGardenPreview(true) }}
        />
      )}

      {/* ステップ14: ガーデン（バブルログ）プレビュー */}
      {showGardenPreview && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 600,
          background: '#F5F0E8',
          display: 'flex', flexDirection: 'column',
          maxWidth: 390, margin: '0 auto',
        }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <GardenDisplay />
          </div>

          {/* ステップ15: メインアプリへ */}
          <div style={{
            flexShrink: 0, padding: '12px 24px 32px',
            background: 'linear-gradient(to bottom, transparent, #F5F0E8 30%)',
          }}>
            <button
              onClick={handleEnterMainApp}
              style={{
                width: '100%', padding: '14px', borderRadius: 24, border: 'none',
                background: '#4A7C59', color: '#FFFFFF',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >
              メインアプリへ 🌿
            </button>
          </div>
        </div>
      )}
    </>
  )
}
