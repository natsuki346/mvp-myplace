'use client'

import { useEffect, useState } from 'react'

type MiRoomPopupProps = {
  onVisit: () => void
  onSkip:  () => void
}

export default function MiRoomPopup({ onVisit, onSkip }: MiRoomPopupProps) {
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
          background: '#FFFFFF',
          borderRadius: 20,
          padding: '36px 24px',
          width: '100%', maxWidth: 320,
          textAlign: 'center',
          boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
        }}
      >
        <span
          className="inline-block rounded-full px-3 py-1 text-xs font-bold mb-3"
          style={{ background: '#F5D78E', color: '#4A7C59' }}
        >
          🌿 実の部屋
        </span>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E', lineHeight: 1.6, margin: '0 0 12px' }}>
          実の部屋をのぞいてみよう
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.55)', lineHeight: 1.65, margin: '0 0 24px' }}>
          光の面でつながる場所です。
          <br />
          得意なこと・好きなことを持つ人たちと話せます。
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => close(onVisit)}
            style={{
              padding: '14px', borderRadius: 30, border: 'none',
              background: '#4A7C59', color: '#FFFFFF',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >訪問する →</button>
          <button
            onClick={() => close(onSkip)}
            style={{
              padding: '12px', borderRadius: 30, border: 'none',
              background: '#C4B49A', color: '#3B2F1E',
              fontSize: 14, cursor: 'pointer',
            }}
          >あとで</button>
        </div>
      </div>
    </div>
  )
}
