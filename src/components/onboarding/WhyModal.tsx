'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  { num: '①', label: '自分を理解する' },
  { num: '②', label: '仲間と繋がる' },
  { num: '③', label: '向き合い、成長する' },
]

type Props = { onStart: () => void }

export default function WhyModal({ onStart }: Props) {
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
          {STEPS.map(({ num, label }) => (
            <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: '#4A7C59',
                  width: 26,
                  flexShrink: 0,
                  textAlign: 'center',
                }}
              >
                {num}
              </span>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#3B2F1E' }}>
                {label}
              </span>
            </div>
          ))}
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
          はじめる
        </button>
      </div>
    </div>
  )
}
