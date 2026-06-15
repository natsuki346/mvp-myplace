'use client'

import { useEffect, useState } from 'react'

type NeRoomPopupProps = {
  onNext: () => void
  onSkip: () => void
}

export default function NeRoomPopup({ onNext, onSkip }: NeRoomPopupProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  const close = (action: () => void) => {
    setVisible(false)
    setTimeout(action, 250)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 250,
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
          padding: '36px 24px',
          width: '100%', maxWidth: 320,
          textAlign: 'center',
          boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E', lineHeight: 1.6, margin: '0 0 24px' }}>
          🌱 Seedものぞきますか？
        </h2>
        <button
          onClick={() => close(onNext)}
          style={{
            width: '100%', padding: '14px', borderRadius: 24, border: 'none',
            background: '#4A7C59', color: '#FFFFFF',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >のぞく</button>
        <button
          onClick={() => close(onSkip)}
          style={{
            width: '100%', padding: '10px', border: 'none', background: 'none',
            color: '#8B6914', fontSize: 13, textAlign: 'center', cursor: 'pointer',
          }}
        >今はいい</button>
      </div>
    </div>
  )
}
