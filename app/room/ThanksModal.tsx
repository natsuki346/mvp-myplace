'use client'

import { useEffect, useState } from 'react'

type ThanksModalProps = {
  onClose: () => void
}

export default function ThanksModal({ onClose }: ThanksModalProps) {
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
      style={{
        position: 'fixed', inset: 0, zIndex: 270,
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
        <p style={{ fontSize: 32, margin: '0 0 12px' }}>💧</p>
        <p style={{ color: '#3B2F1E', fontSize: 16, fontWeight: 700, lineHeight: 1.6, margin: '0 0 6px' }}>
          ご協力ありがとう！
        </p>
        <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.55)', margin: '0 0 24px', lineHeight: 1.65 }}>
          根に水が撒かれました。
          <br />
          またSeedに来てくださいね。
        </p>
        <button
          onClick={close}
          style={{
            width: '100%', padding: '14px', borderRadius: 30, border: 'none',
            background: '#8B6914', color: '#FFFFFF',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >とじる</button>
      </div>
    </div>
  )
}
