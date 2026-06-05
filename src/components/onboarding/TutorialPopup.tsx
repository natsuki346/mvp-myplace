'use client'

import { useEffect, useState } from 'react'

export function TutorialPopup({ variant }: { variant: 'light' | 'shadow' }) {
  // 光・影それぞれ独立したキーを使用
  const sessionKey = `canvas_tutorial_shown_${variant}`

  const [visible, setVisible] = useState(false)
  const [show,    setShow]    = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(sessionKey)) return
    setShow(true)
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dismiss = () => {
    setVisible(false)
    sessionStorage.setItem(sessionKey, 'true')
    setTimeout(() => setShow(false), 350)
  }

  if (!show) return null

  const isLight = variant === 'light'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: visible ? 'rgba(0,0,0,0.50)' : 'rgba(0,0,0,0)',
        transition: 'background 0.35s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 28px',
      }}
    >
      <div
        style={{
          opacity:    visible ? 1 : 0,
          transform:  visible ? 'translateY(0px)' : 'translateY(16px)',
          transition: 'opacity 0.35s ease, transform 0.35s ease',
          background: isLight ? 'white' : '#1a1a2e',
          borderRadius: 20,
          padding: '32px 24px',
          width: '100%', maxWidth: 320,
          textAlign: 'center',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          border: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <p style={{ fontSize: 28, margin: '0 0 12px' }}>✨</p>
        <p
          style={{
            fontSize: 15, fontWeight: 600, lineHeight: 1.65,
            color: isLight ? '#1a1a1a' : 'white',
            margin: '0 0 28px',
          }}
        >
          タグをタップして色を変えたり、<br />ドラッグして動かせます✨
        </p>
        <button
          onClick={dismiss}
          style={{
            width: '100%', padding: '14px', borderRadius: 30, border: 'none',
            background: isLight ? '#1a1a1a' : 'white',
            color:      isLight ? 'white'   : '#1a1a1a',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          OKはじめる
        </button>
      </div>
    </div>
  )
}
