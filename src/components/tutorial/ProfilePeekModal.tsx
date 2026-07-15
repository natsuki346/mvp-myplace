'use client'

import { useEffect, useState } from 'react'

type Props = {
  onClose: () => void
}

// ホーム初回訪問の締めくくり：左上のアイコンから「プロフィール／マイガーデン」が
// 見られることを、アイコンの位置から吹き出しがポップして出るアニメーションで案内する。
export default function ProfilePeekModal({ onClose }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 240)
  }

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 350,
        background: visible ? 'rgba(59,47,30,0.5)' : 'rgba(59,47,30,0)',
        transition: 'background 0.3s ease',
      }}
    >
      {/* ホームコンテナ（maxWidth 390）に合わせた基準ボックス。
          左上アイコンと同じ位置にリングと吹き出しを重ねる。 */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 390, height: '100%', margin: '0 auto' }}>
        {/* 左上アイコンを囲む脈打つ強調リング */}
        <div
          style={{
            position: 'absolute',
            top: 'calc(8px + env(safe-area-inset-top))', left: 12,
            width: 40, height: 40, borderRadius: '50%',
            border: '2px solid #F6D06B',
            boxShadow: '0 0 0 4px rgba(246,208,107,0.35)',
            animation: 'profilePeekRing 1.6s ease-out infinite',
            pointerEvents: 'none',
          }}
        />

        {/* アイコンからポップして出る吹き出し */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(58px + env(safe-area-inset-top))', left: 12,
            width: 250, maxWidth: 'calc(100% - 24px)',
            transformOrigin: 'top left',
            opacity: visible ? 1 : 0,
            transform: visible ? 'scale(1)' : 'scale(0.3)',
            transition: 'opacity 0.24s ease, transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* アイコンを指す上向きの三角 */}
          <div style={{
            position: 'absolute', top: -7, left: 14,
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid #FFFFFF',
          }} />
          <div style={{
            background: '#FFFFFF', borderRadius: 16, padding: '16px 16px 18px',
            boxShadow: '0 10px 30px rgba(59,47,30,0.25)',
          }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#3B2F1E', margin: '0 0 6px' }}>
              👆 あなたのプロフィール
            </p>
            <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.7)', margin: '0 0 14px', lineHeight: 1.7 }}>
              さっき登録した内容や<span style={{ color: '#4A7C59', fontWeight: 700 }}>マイガーデン</span>は、この左上のアイコンからいつでも見られます。
            </p>
            <button
              onClick={close}
              style={{
                width: '100%', padding: '11px', borderRadius: 22, border: 'none',
                background: '#4A7C59', color: '#FFFFFF',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              確認しました
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes profilePeekRing {
          0%   { opacity: 0.9; transform: scale(1); }
          70%  { opacity: 0;   transform: scale(1.5); }
          100% { opacity: 0;   transform: scale(1.5); }
        }
      `}</style>
    </div>
  )
}
