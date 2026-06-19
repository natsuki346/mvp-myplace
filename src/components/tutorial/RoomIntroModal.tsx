'use client'

import { useEffect, useState } from 'react'

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
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#3B2F1E', lineHeight: 1.6, margin: '0 0 16px' }}>
          🏠 ルームとは
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(59,47,30,0.7)', lineHeight: 1.8, textAlign: 'center', margin: '0 0 20px' }}>
          自分と同じタグを持つ仲間と<br />チャットして繋がれる場所
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28, textAlign: 'center' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E', margin: '0 0 4px' }}>🌼 Daisy</p>
            <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.65)', lineHeight: 1.6, margin: 0 }}>
              あなたの好きやワクワクで繋がれる😊
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E', margin: '0 0 4px' }}>🌱 Seed</p>
            <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.65)', lineHeight: 1.6, margin: 0 }}>
              あなたが持つ悩みで共に成長する💪🔥
            </p>
          </div>
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
