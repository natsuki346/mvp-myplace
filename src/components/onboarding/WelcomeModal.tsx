'use client'

import { useEffect, useState } from 'react'

type WelcomeModalProps = {
  username: string | null
  onNext: () => void
  zIndex?: number
  // 指定すると「〇〇さん、ようこそ！」/「あなたのままで、つながれる場所へ。」の
  // デフォルト文言を上書きする（ガーデン案内終了時の祝福メッセージなど）
  title?: React.ReactNode
  subtitle?: React.ReactNode
  buttonText?: string
}

const SPARKLES = [
  { top: '6%',  left: '10%', size: 14, delay: 0 },
  { top: '12%', left: '84%', size: 18, delay: 0.3 },
  { top: '80%', left: '16%', size: 16, delay: 0.6 },
  { top: '72%', left: '88%', size: 12, delay: 0.9 },
  { top: '2%',  left: '50%', size: 12, delay: 1.2 },
]

export default function WelcomeModal({ username, onNext, zIndex = 500, title, subtitle, buttonText = '閉じて続ける' }: WelcomeModalProps) {
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
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
        background: visible ? 'rgba(59,47,30,0.4)' : 'rgba(59,47,30,0)',
        transition: 'background 0.3s ease',
      }}
    >
      <style>{`
        @keyframes welcome-sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
          50%      { opacity: 1; transform: scale(1.15) rotate(20deg); }
        }
        @keyframes welcome-pop {
          0%   { transform: scale(0.8); opacity: 0; }
          60%  { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          position: 'relative', width: '100%', maxWidth: 342,
          background: 'linear-gradient(160deg, #FFF6E0 0%, #FCEFD2 45%, #F5E0B8 100%)',
          borderRadius: 24,
          padding: '40px 24px 28px',
          textAlign: 'center',
          overflow: 'hidden',
          boxShadow: '0 8px 28px rgba(139,105,20,0.25)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.96)',
          transition: 'opacity 0.35s ease, transform 0.35s ease',
        }}
      >
        {SPARKLES.map((s, i) => (
          <span
            key={i}
            style={{
              position: 'absolute', top: s.top, left: s.left,
              fontSize: s.size, lineHeight: 1,
              animation: visible ? `welcome-sparkle 2.2s ease-in-out ${s.delay}s infinite` : 'none',
              pointerEvents: 'none',
            }}
          >
            ✨
          </span>
        ))}

        <div
          style={{
            fontSize: 46, marginBottom: 14,
            animation: visible ? 'welcome-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
          }}
        >
          🎉
        </div>

        <h2 style={{ fontSize: 21, fontWeight: 800, color: '#8B5A00', margin: '0 0 10px', lineHeight: 1.5 }}>
          {title ?? (username ? <>{username}さん<br />ようこそ！</> : 'ようこそ！')}
        </h2>
        <p style={{ fontSize: 14, color: '#6B4E1A', margin: '0 0 28px', lineHeight: 1.7 }}>
          {subtitle ?? 'あなたのままで、つながれる場所へ。'}
        </p>

        <button
          onClick={onNext}
          style={{
            width: '100%', padding: '14px', borderRadius: 24, border: 'none',
            background: '#4A7C59', color: '#FFFFFF',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(74,124,89,0.35)',
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}
