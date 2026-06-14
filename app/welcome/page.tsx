'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// 花びらの配置角度（外側13枚・内側13枚は半分オフセット、約27.7°間隔）
const PETAL_COUNT = 13
const PETAL_ANGLE_STEP = 360 / PETAL_COUNT
const PETAL_ANGLES = Array.from({ length: PETAL_COUNT }, (_, i) => i * PETAL_ANGLE_STEP)
// 花の中心のつぶつぶ（6個）の座標（60deg間隔・半径7）
// Math.cos/sin は環境によって最終ビットの誤差が出てSSR/CSRでハイドレーションミスマッチを
// 起こすため、事前計算した固定値を使う
const SEED_DOTS = [
  { cx: 7, cy: 0 },
  { cx: 3.5, cy: 6.062 },
  { cx: -3.5, cy: 6.062 },
  { cx: -7, cy: 0 },
  { cx: -3.5, cy: -6.062 },
  { cx: 3.5, cy: -6.062 },
]

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
        width: '100%', maxWidth: 390, margin: '0 auto',
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
          to   { opacity: 0.85; transform: scaleY(1); }
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
          transform-origin: 160px 70px;
        }
        .fruit-group.sway {
          animation: windSway 0.45s ease-in-out 0.1s 2;
        }
      `}</style>

      {/* ── 地上・地下の背景ゾーン ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, display: 'flex', flexDirection: 'column' }}>
        {/* 地上 */}
        <div style={{ height: '60%', background: '#F5F0E8' }} />
        {/* 草ライン */}
        <div style={{ height: 8, background: '#4A7C59' }} />
        {/* 土ライン */}
        <div style={{ height: 5, background: '#8B6914' }} />
        {/* 地下 */}
        <div style={{ flex: 1, background: '#C9A96E' }} />
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
        <p style={{ fontSize: 32, letterSpacing: 1, color: '#7A6A55', marginBottom: 10, fontFamily: "'Dancing Script', cursive" }}>
          SeedMe
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

        {/* メイン デイジー SVG */}
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
              opacity: loaded ? 0.85 : 0,
            }}
          >
            {/* 主根（太め） */}
            <path d="M160 340 Q158 400 160 460 Q162 520 158 580"
              fill="none" stroke="#8B6914" strokeWidth="4" strokeLinecap="round" />
            {/* 左中根 */}
            <path d="M159 390 Q130 420 110 460 Q95 495 88 530"
              fill="none" stroke="#8B6914" strokeWidth="3" strokeLinecap="round" />
            {/* 右中根 */}
            <path d="M161 390 Q190 420 210 460 Q225 495 232 530"
              fill="none" stroke="#8B6914" strokeWidth="3" strokeLinecap="round" />
            {/* 左細根 */}
            <path d="M110 460 Q90 478 78 505"
              fill="none" stroke="#A0791A" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M88 530 Q72 545 64 568"
              fill="none" stroke="#A0791A" strokeWidth="2" strokeLinecap="round" />
            <path d="M158 580 Q145 600 140 622"
              fill="none" stroke="#A0791A" strokeWidth="2" strokeLinecap="round" />
            {/* 右細根 */}
            <path d="M210 460 Q230 478 242 505"
              fill="none" stroke="#A0791A" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M232 530 Q248 545 256 568"
              fill="none" stroke="#A0791A" strokeWidth="2" strokeLinecap="round" />
            <path d="M158 580 Q172 600 178 622"
              fill="none" stroke="#A0791A" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* ── 茎（stroke-dashoffset アニメ・わずかにカーブ） ── */}
          <path
            d="M160 340 Q166 200 160 58"
            fill="none" stroke="#5A8A40" strokeWidth="6" strokeLinecap="round"
            strokeDasharray="300" strokeDashoffset={loaded ? 0 : 300}
            style={{ transition: loaded ? 'stroke-dashoffset 0.6s ease-out 0.3s' : 'none' }}
          />

          {/* ── 根元の葉（放射状6枚・地面スレスレ） ── */}
          <g
            className={`leaf-group${isLeaving ? ' sway' : ''}`}
            style={{
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.4s ease 0.8s',
            }}
          >
            {/* 左右水平に広がる葉 */}
            <ellipse cx="128" cy="339" rx="28" ry="9" fill="#3D7048" transform="rotate(-4 128 339)" />
            <ellipse cx="192" cy="339" rx="28" ry="9" fill="#3D7048" transform="rotate(4 192 339)" />
            {/* 斜め下に垂れる葉 */}
            <ellipse cx="142" cy="349" rx="20" ry="7" fill="#4A7C59" transform="rotate(-38 142 349)" />
            <ellipse cx="178" cy="349" rx="20" ry="7" fill="#4A7C59" transform="rotate(38 178 349)" />
            {/* 斜め上に立ち上がる葉 */}
            <ellipse cx="140" cy="322" rx="18" ry="6" fill="#4A7C59" transform="rotate(-58 140 322)" />
            <ellipse cx="180" cy="322" rx="18" ry="6" fill="#4A7C59" transform="rotate(58 180 322)" />
          </g>

          {/* ── 茎の中ほどの葉（先細り形状） ── */}
          <g style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.4s ease 1.0s' }}>
            <path d="M160 200 C128 190 105 202 98 218 C122 226 150 214 160 200 Z" fill="#4A7C59" />
            <path d="M160 196 C192 186 215 198 222 214 C198 222 170 210 160 196 Z" fill="#4A7C59" />
          </g>

          {/* ── 花（デイジー） ── */}
          <g
            className={`fruit-group${isLeaving ? ' sway' : ''}`}
            style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.4s ease 0.9s' }}
          >
            <g transform="translate(160 70)">
              {/* 外側花びら13枚 */}
              {PETAL_ANGLES.map((angle, i) => (
                <path key={`outer-${angle}`}
                  d="M0,0 C-8,-15 -6,-55 0,-72 C6,-55 8,-15 0,0Z"
                  fill={i % 2 === 0 ? '#F5D060' : '#F0C840'}
                  transform={`rotate(${angle})`} />
              ))}
              {/* 内側花びら13枚（外側の間に半分オフセット配置） */}
              {PETAL_ANGLES.map(angle => (
                <path key={`inner-${angle}`}
                  d="M0,0 C-5,-10 -4,-36 0,-46 C4,-36 5,-10 0,0Z"
                  fill="#EFC030"
                  transform={`rotate(${angle + PETAL_ANGLE_STEP / 2})`} />
              ))}
              {/* 花の中心（ドーム状） */}
              <circle cx="0" cy="0" r="22" fill="#C47A10" />
              <circle cx="0" cy="0" r="18" fill="#D98C18" />
              <circle cx="0" cy="0" r="13" fill="#E8A020" />
              {/* つぶつぶ */}
              {SEED_DOTS.map(({ cx, cy }, i) => (
                <circle key={i} cx={cx} cy={cy} r="2.2" fill="#C47A10" opacity="0.6" />
              ))}
            </g>
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
