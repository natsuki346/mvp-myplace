'use client'

import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'

interface GardenOnboardingModalProps {
  onClose: () => void
}

export default function GardenOnboardingModal({ onClose }: GardenOnboardingModalProps) {
  const { advanceStep } = useTutorialStep()

  const handleStart = () => {
    advanceStep('onboarding_seed_visit')
    onClose()
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(59,47,30,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 24px',
    }}>
      <div style={{
        width: '100%',
        background: '#F5F0E8',
        borderRadius: 20,
        padding: 24,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🌱</div>

        <h2 style={{
          fontSize: 20, fontWeight: 800, color: '#3B2F1E',
          margin: '0 0 12px', lineHeight: 1.4,
        }}>
          ここがあなたのガーデン
        </h2>

        <p style={{
          fontSize: 14, color: 'rgba(59,47,30,0.65)',
          lineHeight: 1.75, margin: '0 0 28px',
          whiteSpace: 'pre-line',
        }}>
          {'登録したハッシュタグが\nバブルになって並んでいます。\nルームを訪れるたびにバブルが育っていくよ。'}
        </p>

        <button
          onClick={handleStart}
          style={{
            width: '100%', padding: '14px', borderRadius: 24, border: 'none',
            background: '#4A7C59', color: '#FFFFFF',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(74,124,89,0.3)',
          }}
        >
          見てみる
        </button>
      </div>
    </div>
  )
}
