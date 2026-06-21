'use client'

import { useEffect, useState } from 'react'

type GrowthWelcomeMessageProps = {
  onNext: () => void
  zIndex?: number
}

export default function GrowthWelcomeMessage({ onNext, zIndex = 300 }: GrowthWelcomeMessageProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex,
        maxWidth: 390, margin: '0 auto',
        background: '#F5F0E8',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 32px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      <div
        style={{
          fontSize: 48, lineHeight: 1, marginBottom: 28,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s',
        }}
      >
        🌼
      </div>

      <p
        style={{
          fontSize: 21, fontWeight: 700, color: '#E0708A',
          margin: '0 0 16px', lineHeight: 1.6, textAlign: 'center',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s',
        }}
      >
        DaiMeは己を愛でる場所です。
      </p>
      <p
        style={{
          fontSize: 15, color: '#3B2F1E',
          margin: '0 0 56px', lineHeight: 1.7, textAlign: 'center',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s',
        }}
      >
        さあ、あなた自身の旅を始めましょう！
      </p>

      <button
        onClick={onNext}
        style={{
          width: '100%', padding: '14px', borderRadius: 24, border: 'none',
          background: '#4A7C59', color: '#FFFFFF',
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.5s ease 0.4s',
        }}
      >
        始める
      </button>
    </div>
  )
}
