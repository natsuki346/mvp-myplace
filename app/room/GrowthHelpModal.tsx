'use client'

import { useEffect, useState } from 'react'

const ACTIONS = [
  { icon: '🚪', label: '部屋をのぞく', point: '+1pt' },
  { icon: '💬', label: '会話をひらく', point: '+2pt' },
  { icon: '✍️', label: '言葉を届ける', point: '+3pt' },
]

export default function GrowthHelpModal({ onClose, buttonText = 'とじる' }: { onClose: () => void; buttonText?: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 280,
        background: visible ? 'rgba(59,47,30,0.55)' : 'rgba(59,47,30,0)',
        transition: 'background 0.3s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0px)' : 'translateY(16px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          background: '#F5F0E8',
          borderRadius: 24,
          padding: '32px 24px',
          width: '100%', maxWidth: 340,
          maxHeight: '80vh', overflowY: 'auto',
          boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
        }}
      >
        <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: '#3B2F1E', textAlign: 'center' }}>
          🌱 成長のしかた
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 12, color: '#4A7C59', fontWeight: 600, textAlign: 'center' }}>
          ありのままの自分を愛でるために
        </p>

        <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.75)', lineHeight: 1.8, margin: '0 0 16px' }}>
          DaisyやSeedは、あなたが部屋に訪れたり、誰かと言葉を交わすたびに、少しずつ育っていきます。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {ACTIONS.map(item => (
            <div
              key={item.label}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FFFFFF', borderRadius: 12, padding: '10px 14px',
              }}
            >
              <span style={{ fontSize: 13, color: '#3B2F1E' }}>{item.icon} {item.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4A7C59' }}>{item.point}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.75)', lineHeight: 1.8, margin: '0 0 4px' }}>
          ポイントが貯まるごとに、タネ → 芽 → つぼみ → 満開 へと育っていきます。
        </p>
        <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.55)', lineHeight: 1.8, margin: '0 0 24px' }}>
          無理に変わろうとしなくて大丈夫。ありのままのあなたの言葉が、ここでは育っていく糧になります。
        </p>

        <button
          onClick={close}
          style={{
            width: '100%', padding: '14px', borderRadius: 30, border: 'none',
            background: '#4A7C59', color: '#FFFFFF',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}
