'use client'

import { useEffect, useState } from 'react'
import { DaisyIcon } from '@/src/components/icons/DaisyIcon'

type RoomExplainMiModalProps = {
  onNext: () => void
}

export default function RoomExplainMiModal({ onNext }: RoomExplainMiModalProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  const handleNext = () => {
    setVisible(false)
    setTimeout(onNext, 250)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 260,
        background: visible ? 'rgba(59,47,30,0.55)' : 'rgba(59,47,30,0)',
        transition: 'background 0.3s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
      }}
    >
      <div
        style={{
          opacity:    visible ? 1 : 0,
          transform:  visible ? 'translateY(0px)' : 'translateY(16px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          background: '#F5F0E8',
          borderRadius: 24,
          padding: '44px 32px',
          width: '100%', maxWidth: 340,
          textAlign: 'center',
          boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E', lineHeight: 1.6, margin: '0 0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <DaisyIcon size={20} stage={4} active /> 実の部屋
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.7)', lineHeight: 1.7, margin: '0 0 24px' }}>
          同じ好きやお気に入りのタグで集まる部屋。<br />
          ポジティブな言葉や気づきを<br />
          シェアできる場所です。
        </p>
        <button
          onClick={handleNext}
          style={{
            width: '100%', padding: '14px', borderRadius: 30, border: 'none',
            background: '#4A7C59', color: '#FFFFFF',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >次へ</button>
      </div>
    </div>
  )
}
