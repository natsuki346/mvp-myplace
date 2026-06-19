'use client'

import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'

interface GrowthExplainModalProps {
  onClose: () => void
  onOpenBubble: () => void
  onOpenHelp?: () => void
}

const STAGES = [
  { emoji: '🌱', label: 'まだ種',    bg: '#D4B896', desc: 'ルームをのぞいてみよう' },
  { emoji: '🌿', label: '芽が出た',  bg: '#9DC08B', desc: '仲間と言葉を交わしていこう' },
  { emoji: '🌼', label: '蕾になった', bg: '#F5D78E', desc: 'あとはただ、続けること' },
]

export default function GrowthExplainModal({ onClose, onOpenBubble, onOpenHelp }: GrowthExplainModalProps) {
  const { advanceStep } = useTutorialStep()

  const handleContinue = () => {
    advanceStep('done')
    onOpenBubble()
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
      }}>
        <h2 style={{
          fontSize: 20, fontWeight: 800, color: '#3B2F1E',
          margin: '0 0 20px', textAlign: 'center',
        }}>
          バブルは育つ
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          {STAGES.map(({ emoji, label, bg, desc }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: bg, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
              }}>
                {emoji}
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#8B6914', margin: '0 0 2px' }}>
                  {label}
                </p>
                <p style={{ fontSize: 13, color: '#3B2F1E', margin: 0, lineHeight: 1.5 }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.5)', margin: 0 }}>
            詳しくはヘルプをみてね
          </p>
          <button
            onClick={() => onOpenHelp?.()}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#FFFFFF', border: '1px solid rgba(139,105,20,0.2)',
              cursor: onOpenHelp ? 'pointer' : 'default',
              fontSize: 13, fontWeight: 700, color: '#8B6914',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ？
          </button>
        </div>

        <button
          onClick={handleContinue}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: '#4A7C59', color: '#FFFFFF',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(74,124,89,0.3)',
          }}
        >
          バブルの中をのぞいてみる
        </button>
      </div>
    </div>
  )
}
