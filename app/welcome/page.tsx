'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function WelcomePage() {
  const router    = useRouter()
  const [loaded,    setLoaded]    = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 60)
    return () => clearTimeout(t)
  }, [])

  const handleStart = () => {
    setIsLeaving(true)
    setTimeout(() => router.push('/process-map?step=1'), 900)
  }

  return (
    <div
      style={{
        width: '100%', maxWidth: 480, margin: '0 auto',
        minHeight: '100svh', background: '#F7F3ED',
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
        opacity: isLeaving ? 0 : 1,
        transition: isLeaving ? 'opacity 0.5s ease' : 'none',
      }}
    >
      <style>{`
        @keyframes growRoot {
          from { opacity: 0; transform: scaleY(0); }
          to   { opacity: 1; transform: scaleY(1); }
        }
        @keyframes growStem {
          from { stroke-dashoffset: 160; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes windSway {
          0%   { transform: rotate(0deg); }
          25%  { transform: rotate(5deg); }
          75%  { transform: rotate(-5deg); }
          100% { transform: rotate(0deg); }
        }
        .leaf-group {
          transform-origin: 160px 340px;
        }
        .leaf-group.sway {
          animation: windSway 0.45s ease-in-out 2;
        }
        .fruit-group {
          transform-origin: 160px 340px;
        }
        .fruit-group.sway {
          animation: windSway 0.45s ease-in-out 0.1s 2;
        }
      `}</style>

      {/* ── 地上・地下の背景ゾーン ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {/* 地上（上60%） */}
        <div style={{ height: '60%', background: '#F0EBE0' }} />
        {/* 地下（下40%） */}
        <div style={{ height: '40%', background: '#E8DCC8' }} />
        {/* 土の波線 */}
        <svg
          viewBox="0 0 480 28"
          style={{ position: 'absolute', top: 'calc(60% - 14px)', left: 0, width: '100%' }}
          preserveAspectRatio="none"
        >
          <path
            d="M0 14 Q24 4 48 14 Q72 24 96 14 Q120 4 144 14 Q168 24 192 14 Q216 4 240 14 Q264 24 288 14 Q312 4 336 14 Q360 24 384 14 Q408 4 432 14 Q456 24 480 14 L480 28 L0 28 Z"
            fill="#C4B090" opacity="0.55"
          />
          <path
            d="M0 14 Q24 4 48 14 Q72 24 96 14 Q120 4 144 14 Q168 24 192 14 Q216 4 240 14 Q264 24 288 14 Q312 4 336 14 Q360 24 384 14 Q408 4 432 14 Q456 24 480 14"
            fill="none" stroke="#C4B090" strokeWidth="2.5"
          />
        </svg>
      </div>

      {/* ── 上部テキスト ── */}
      <div
        style={{
          position: 'relative', zIndex: 2,
          paddingTop: 48, textAlign: 'center', paddingBottom: 16,
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.4s ease 1.5s, transform 0.4s ease 1.5s',
        }}
      >
        <p style={{ fontSize: 13, letterSpacing: 3, color: '#7A6A55', marginBottom: 10, textTransform: 'uppercase' }}>
          WhyMe
        </p>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: '#3D2E1A', marginBottom: 8, lineHeight: 1.5 }}>
          根があるから、実がなる。
        </h1>
        <p style={{ fontSize: 13, color: '#8B7355' }}>
          あなたのすべてが、ここにある。
        </p>
      </div>

      {/* ── 植物イラスト ── */}
      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', justifyContent: 'center' }}>

        {/* 実タグ（地上・左） */}
        <div style={{
          position: 'absolute', left: '8%', top: '14%',
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.4s ease 1.2s, transform 0.4s ease 1.2s',
        }}>
          <span style={{
            display: 'inline-block', background: '#FAC775', color: '#633806',
            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
            whiteSpace: 'nowrap',
          }}># 人と話すのが好き</span>
        </div>

        {/* 実タグ（地上・右） */}
        <div style={{
          position: 'absolute', right: '6%', top: '28%',
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.4s ease 1.3s, transform 0.4s ease 1.3s',
        }}>
          <span style={{
            display: 'inline-block', background: '#FAC775', color: '#633806',
            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
            whiteSpace: 'nowrap',
          }}># 新しいことが好き</span>
        </div>

        {/* 根タグ（地下・左） */}
        <div style={{
          position: 'absolute', left: '5%', bottom: '22%',
          opacity: loaded ? 0.75 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.4s ease 1.4s, transform 0.4s ease 1.4s',
        }}>
          <span style={{
            display: 'inline-block', background: '#C4A882', color: '#6B4E1A',
            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
            whiteSpace: 'nowrap',
          }}># 認められたい</span>
        </div>

        {/* 根タグ（地下・右） */}
        <div style={{
          position: 'absolute', right: '2%', bottom: '6%',
          opacity: loaded ? 0.75 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.4s ease 1.5s, transform 0.4s ease 1.5s',
        }}>
          <span style={{
            display: 'inline-block', background: '#C4A882', color: '#6B4E1A',
            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
            whiteSpace: 'nowrap',
          }}># 本当は甘えたい</span>
        </div>

        {/* メイン植物 SVG */}
        <svg
          width="320" height="380"
          viewBox="0 0 320 380"
          style={{ overflow: 'visible' }}
        >
          {/* ── 根（地下・どっしり広がる）── */}
          <g
            className={`root-group${isLeaving ? ' sway' : ''}`}
            style={{
              transformOrigin: '160px 340px',
              animation: loaded ? 'growRoot 0.8s ease-out forwards' : 'none',
              opacity: loaded ? 1 : 0,
            }}
          >
            {/* メイン根（太め） */}
            <path d="M160 340 Q158 400 157 460 Q156 520 155 580"
              fill="none" stroke="#6B4F12" strokeWidth="5" strokeLinecap="round"/>
            {/* 左大根 */}
            <path d="M158 380 Q125 410 95 450 Q70 485 53 525"
              fill="none" stroke="#6B4F12" strokeWidth="4" strokeLinecap="round"/>
            {/* 右大根 */}
            <path d="M160 380 Q193 410 223 450 Q248 485 265 525"
              fill="none" stroke="#6B4F12" strokeWidth="4" strokeLinecap="round"/>
            {/* 左中根1 */}
            <path d="M95 450 Q70 470 47 502 Q30 528 23 560"
              fill="none" stroke="#8B6914" strokeWidth="2.5" strokeLinecap="round"/>
            {/* 左中根2 */}
            <path d="M95 450 Q83 485 77 515"
              fill="none" stroke="#8B6914" strokeWidth="2" strokeLinecap="round"/>
            {/* 右中根1 */}
            <path d="M223 450 Q248 470 271 502 Q288 528 295 560"
              fill="none" stroke="#8B6914" strokeWidth="2.5" strokeLinecap="round"/>
            {/* 右中根2 */}
            <path d="M223 450 Q235 485 241 515"
              fill="none" stroke="#8B6914" strokeWidth="2" strokeLinecap="round"/>
            {/* 左細根 */}
            <path d="M53 525 Q37 540 27 562"
              fill="none" stroke="#A0791A" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M47 502 Q30 512 20 530"
              fill="none" stroke="#A0791A" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M155 580 Q140 598 133 620"
              fill="none" stroke="#A0791A" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M155 580 Q170 598 177 620"
              fill="none" stroke="#A0791A" strokeWidth="1.5" strokeLinecap="round"/>
            {/* 右細根 */}
            <path d="M265 525 Q281 540 291 562"
              fill="none" stroke="#A0791A" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M271 502 Q288 512 298 530"
              fill="none" stroke="#A0791A" strokeWidth="1.2" strokeLinecap="round"/>
          </g>

          {/* ── 茎（stroke-dashoffset アニメ） ── */}
          <line
            x1="160" y1="340" x2="160" y2="20"
            stroke="#4A7C59" strokeWidth="4" strokeLinecap="round"
            strokeDasharray="320" strokeDashoffset={loaded ? 0 : 320}
            style={{ transition: loaded ? 'stroke-dashoffset 0.6s ease-out 0.3s' : 'none' }}
          />

          {/* ── 葉 ── */}
          <g
            className={`leaf-group${isLeaving ? ' sway' : ''}`}
            style={{
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.4s ease 0.8s',
            }}
          >
            {/* 左葉 */}
            <path d="M158 140 Q115 115 98 135 Q110 155 155 148 Z"
              fill="#6BAF7A" />
            {/* 右葉 */}
            <path d="M162 100 Q205 72 224 92 Q210 112 165 108 Z"
              fill="#6BAF7A" />
            {/* 小さい左葉 */}
            <path d="M159 72 Q135 58 128 72 Q138 84 160 78 Z"
              fill="#5E9E6A" />
          </g>

          {/* ── 実（トマト風） ── */}
          <g
            className={`fruit-group${isLeaving ? ' sway' : ''}`}
            style={{
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.4s ease 0.9s',
            }}
          >
            {/* 実1（左） */}
            <circle cx="118" cy="122" r="22" fill="#D85A30" />
            <circle cx="118" cy="122" r="22" fill="url(#fruitGrad1)" />
            <path d="M118 100 Q112 94 108 98" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" />
            {/* 実2（右） */}
            <circle cx="196" cy="88" r="20" fill="#D85A30" />
            <circle cx="196" cy="88" r="20" fill="url(#fruitGrad2)" />
            <path d="M196 68 Q191 62 188 66" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" />
            {/* 小さい実 */}
            <circle cx="140" cy="62" r="14" fill="#C44D28" />
            <path d="M140 48 Q136 43 133 46" fill="none" stroke="#4A7C59" strokeWidth="1.5" strokeLinecap="round" />

            <defs>
              <radialGradient id="fruitGrad1" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#E87050" />
                <stop offset="100%" stopColor="#B84420" />
              </radialGradient>
              <radialGradient id="fruitGrad2" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#E87050" />
                <stop offset="100%" stopColor="#B84420" />
              </radialGradient>
            </defs>
          </g>
        </svg>
      </div>

      {/* ── はじめるボタン ── */}
      <div
        style={{
          position: 'relative', zIndex: 2,
          padding: '16px 24px 48px', textAlign: 'center',
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.4s ease 1.6s, transform 0.4s ease 1.6s',
        }}
      >
        <button
          onClick={handleStart}
          style={{
            background: '#4A7C59', color: '#ffffff',
            border: 'none', borderRadius: 24,
            padding: '14px 48px', fontSize: 15, fontWeight: 500,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(74,124,89,0.35)',
            transition: 'transform 0.1s ease, opacity 0.1s ease',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.97)')}
          onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          はじめる
        </button>
      </div>

    </div>
  )
}
