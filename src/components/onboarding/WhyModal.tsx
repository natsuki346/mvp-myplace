'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  { num: '①', label: '自分を理解する' },
  { num: '②', label: '仲間と繋がる' },
  { num: '③', label: '向き合い、成長する' },
]

const BUTTON_LABELS: Record<1 | 2 | 3, string> = {
  1: 'はじめる',
  2: 'はじめる',
  3: '向き合ってみる',
}

const HIGHLIGHT = '#C0392B'

type Props = { onStart: () => void; currentStep?: 1 | 2 | 3 }

export default function WhyModal({ onStart, currentStep }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
        background: 'rgba(59,47,30,0.35)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 342,
          background: '#F5F0E8',
          borderRadius: 20,
          padding: '36px 28px 28px',
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'transform 0.4s ease',
        }}
      >
        {/* タイトル */}
        <h2
          style={{
            margin: '0 0 28px',
            fontSize: 22,
            fontWeight: 800,
            color: '#3B2F1E',
            lineHeight: 1.45,
            textAlign: 'center',
            letterSpacing: '0.02em',
          }}
        >
          ありのままに、<br />愛でるために
        </h2>

        {/* ステップ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
          {STEPS.map(({ num, label }, i) => {
            const active = currentStep === i + 1
            return (
              <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: active ? HIGHLIGHT : '#4A7C59',
                    width: 26,
                    flexShrink: 0,
                    textAlign: 'center',
                  }}
                >
                  {num}
                </span>
                <span style={{ fontSize: 15, fontWeight: 600, color: active ? HIGHLIGHT : '#3B2F1E', flex: 1 }}>
                  {label}
                </span>
                {active && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: HIGHLIGHT,
                      border: `1px solid ${HIGHLIGHT}`,
                      borderRadius: 4,
                      padding: '1px 5px',
                      lineHeight: 1.4,
                      flexShrink: 0,
                    }}
                  >
                    次ここ
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <button
          onClick={onStart}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 24,
            border: 'none',
            background: '#4A7C59',
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {currentStep ? BUTTON_LABELS[currentStep] : 'はじめる'}
        </button>
      </div>
    </div>
  )
}
