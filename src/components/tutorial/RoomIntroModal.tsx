'use client'

import { useEffect, useState } from 'react'
import { DaisyIcon } from '@/src/components/icons/DaisyIcon'

type RoomIntroModalProps = {
  onNext: () => void
}

export default function RoomIntroModal({ onNext }: RoomIntroModalProps) {
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
          padding: '32px 24px',
          width: '100%', maxWidth: 320, maxHeight: '80vh',
          overflowY: 'auto',
          textAlign: 'center',
          boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E', lineHeight: 1.6, margin: '0 0 12px' }}>
          🏠 ルームってなに？
        </h2>
        <div style={{ fontSize: 13, color: 'rgba(59,47,30,0.7)', lineHeight: 1.7, textAlign: 'center', margin: '0 0 24px' }}>
          <p style={{ margin: 0 }}>同じタグを持つ人たちが集まり、<br />チャットで会話ができます。</p>

          <p style={{ margin: '12px 0 0', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <DaisyIcon size={18} stage={4} active /> Daisy
          </p>
          <p style={{ margin: 0 }}>自分の好きなことや<br />同じ共通点を持つ人たちが集まる場所。</p>

          <p style={{ margin: '12px 0 0', fontWeight: 600 }}>🌱 Seed</p>
          <p style={{ margin: 0 }}>なかなか打ち明けられなかった言葉や<br />同じ境遇を持つ人が集まり、<br />言葉を交わすことができます。</p>
        </div>
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
