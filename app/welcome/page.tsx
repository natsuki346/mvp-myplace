'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function WelcomePage() {
  const router   = useRouter()
  const [username, setUsername] = useState('')
  const [visible,  setVisible]  = useState(false)

  useEffect(() => {
    const name = sessionStorage.getItem('username') ?? ''
    setUsername(name)

    const fadeIn = setTimeout(() => setVisible(true), 80)
    const nav    = setTimeout(() => router.push('/process-map?step=1'), 3000)

    return () => {
      clearTimeout(fadeIn)
      clearTimeout(nav)
    }
  }, [router])

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-8"
      style={{ background: '#080808', maxWidth: 390, margin: '0 auto', position: 'relative', overflow: 'hidden' }}
    >
      {/* pulse アニメーション定義 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.55; }
        }
      `}</style>

      {/* 左側：ゴールドグロー */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '35%',
        width: 240, height: 240,
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(201,168,76,0.14) 0%, transparent 70%)',
        animation: 'pulse 3s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      {/* 右側：パープルグロー */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '65%',
        width: 240, height: 240,
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(138,90,255,0.14) 0%, transparent 70%)',
        animation: 'pulse 3s ease-in-out 1.5s infinite',
        pointerEvents: 'none',
      }} />

      {/* コンテンツ */}
      <div
        style={{
          opacity:   visible ? 1 : 0,
          transform: visible ? 'translateY(0px)' : 'translateY(20px)',
          transition:'opacity 0.8s ease, transform 0.8s ease',
          textAlign: 'center',
          position:  'relative',
        }}
      >
        {/* インフィニティ SVG */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
          <svg width="210" height="95" viewBox="0 0 210 95">
            <defs>
              {/* クリップ */}
              <clipPath id="lc">
                <rect x="0" y="0" width="105" height="95"/>
              </clipPath>
              <clipPath id="rc">
                <rect x="105" y="0" width="105" height="95"/>
              </clipPath>

              {/* ゴールドグラデーション（縦） */}
              <linearGradient id="goldG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#f0d888"/>
                <stop offset="50%"  stopColor="#c9a84c"/>
                <stop offset="100%" stopColor="#9a7830"/>
              </linearGradient>

              {/* パープルグラデーション（縦） */}
              <linearGradient id="purpleG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#c8aaff"/>
                <stop offset="50%"  stopColor="#8a5aff"/>
                <stop offset="100%" stopColor="#5828cc"/>
              </linearGradient>

              {/* ソフトグローフィルター */}
              <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* 左側：ゴールド */}
            <g clipPath="url(#lc)" filter="url(#glowFilter)">
              <path
                d="M105 47 C105 26 92 10 70 10 C48 10 22 24 22 47 C22 70 48 85 70 85 C92 85 105 68 105 47Z"
                fill="none" stroke="url(#goldG)" strokeWidth="9" strokeLinecap="round"/>
              <path
                d="M105 47 C105 68 118 85 140 85 C162 85 188 70 188 47"
                fill="none" stroke="url(#goldG)" strokeWidth="9" strokeLinecap="round"/>
            </g>

            {/* 右側：パープル */}
            <g clipPath="url(#rc)" filter="url(#glowFilter)">
              <path
                d="M105 47 C105 26 92 10 70 10 C48 10 22 24 22 47"
                fill="none" stroke="url(#purpleG)" strokeWidth="9" strokeLinecap="round"/>
              <path
                d="M105 47 C105 68 118 85 140 85 C162 85 188 70 188 47 C188 24 162 10 140 10 C118 10 105 26 105 47Z"
                fill="none" stroke="url(#purpleG)" strokeWidth="9" strokeLinecap="round"/>
            </g>

            {/* 中心の結節点 */}
            <circle cx="105" cy="47" r="5" fill="#0a0a0a"/>
            <circle cx="105" cy="47" r="2" fill="#555"/>
          </svg>
        </div>

        {/* WELCOME ラベル */}
        <p style={{
          fontSize: 11, color: '#404040', letterSpacing: '0.2em',
          marginBottom: 18, textTransform: 'uppercase',
        }}>
          W E L C O M E
        </p>

        {/* ユーザー名 */}
        <p style={{
          fontSize: 28, fontWeight: 400, color: '#f0f0f0',
          marginBottom: 18, lineHeight: 1.4,
        }}>
          {username ? `${username}さん、ようこそ。` : 'ようこそ。'}
        </p>

        {/* サブテキスト */}
        <p style={{
          fontSize: 13, color: '#404040',
          lineHeight: 2, letterSpacing: '0.04em',
        }}>
          あなたの場所が、今ここにできました。
        </p>
      </div>
    </div>
  )
}
