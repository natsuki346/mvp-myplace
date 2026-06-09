'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// ?step=N → 表示開始カード（配列インデックス）と遷移先のマッピング
// startIndex  : スライドの表示開始位置（最初に見せるカード）
// thresholdIdx: 「はじめる」表示 & 「次ここ」バッジの閾値インデックス
const STEP_CONFIG: Record<number, { startIndex: number; thresholdIdx: number; destination: string }> = {
  1: { startIndex: 1, thresholdIdx: 3, destination: '/onboarding' },            // 自分に出会う時 → 実 → 根 → /onboarding
  2: { startIndex: 4, thresholdIdx: 4, destination: '/onboarding/canvas-light' }, // 「自分をデコる時」→ キャンバス編集
  3: { startIndex: 5, thresholdIdx: 5, destination: '/canvas' },                  // 「共鳴の場が広がる時」→ /canvas
}

// ── ステップデータ ─────────────────────────────────────────────────────────────

type StepStatus = 'done' | 'current' | 'future'
type SlideKind = 'jitsu' | 'ne'

const STEPS: { step: number; title: string; desc: string; image: string; video?: string; status: StepStatus; kind?: SlideKind }[] = [
  {
    step: 1, title: 'あなたを登録する',
    desc: 'ユーザーネームを設定した',
    image: '/images/steps/preview.webp', status: 'done',
  },
  {
    step: 2, title: '自分に出会う時',
    desc: '4つの問いに答えていくと、\nあなたらしい言葉が集まってくる。\n好きなこと、大切にしていること、\nそのすべてがあなた自身。',
    image: '/images/steps/preview.webp', status: 'done',
  },
  {
    step: 2, title: '実（み）とは？',
    desc: '', image: '', status: 'done', kind: 'jitsu',
  },
  {
    step: 2, title: '根（ね）とは？',
    desc: '', image: '', status: 'done', kind: 'ne',
  },
  {
    step: 3, title: '自分をデコる時',
    desc: '集まった言葉をキャンバスに並べていく。\n色を変えたり、動かしたり。\nありのままの自分がデザインされ、\n芸術になっていく。',
    image: '/images/steps/preview.webp', video: '/images/steps/step3.mp4', status: 'done',
  },
  {
    step: 4, title: '共鳴の場が広がる時',
    desc: 'あなたのキャンバスが、Roomへの扉になる。\n同じ価値観や境遇を持つ人が、必ずいる。\n名前も顔も関係ない。\nありのままの自分で、本物の共鳴が生まれる場所。',
    image: '/images/steps/preview.webp', video: '/images/steps/step4.mp4', status: 'current',
  },
  {
    step: 5, title: '本物のつながりへ',
    desc: '〇〇での出会いは、自然と共鳴する。\n飾らなくていい、合わせなくていい。\nありのままの自分でいられる、\n本物のつながりがここにある。',
    image: '/images/steps/preview.webp', status: 'future',
  },
]

const DEFAULT_STEP = 3  // デフォルトは step=3（Step 4 を表示）

// ── ステップアイコン（SVG） ────────────────────────────────────────────────────

function StepIcon({ stepNum, color }: { stepNum: number; color: string }) {
  const s = { stroke: color, fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round' as const }
  if (stepNum === 2) return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="13" r="5" {...s} />
      <path d="M11 34 C11 25 29 25 29 34" {...s} />
      <line x1="20" y1="2" x2="20" y2="5" {...s} /><line x1="7" y1="7" x2="9.5" y2="9.5" {...s} />
      <line x1="33" y1="7" x2="30.5" y2="9.5" {...s} /><line x1="3" y1="17" x2="6.5" y2="17" {...s} />
      <line x1="37" y1="17" x2="33.5" y2="17" {...s} />
    </svg>
  )
  if (stepNum === 3) return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <ellipse cx="20" cy="24" rx="13" ry="9" {...s} />
      <circle cx="23" cy="20" r="2.5" {...s} />
      <circle cx="12" cy="22" r="1.8" fill={color} opacity="0.7" />
      <circle cx="16" cy="30" r="1.8" fill={color} opacity="0.7" />
      <circle cx="25" cy="31" r="1.8" fill={color} opacity="0.7" />
      <line x1="27" y1="16" x2="35" y2="7" {...s} />
      <circle cx="26" cy="17" r="2" fill={color} opacity="0.4" />
    </svg>
  )
  if (stepNum === 4) return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="15" cy="20" r="4.5" {...s} />
      <circle cx="15" cy="20" r="9"   stroke={color} fill="none" strokeWidth={1} opacity={0.5} />
      <circle cx="15" cy="20" r="13"  stroke={color} fill="none" strokeWidth={0.75} opacity={0.25} />
      <circle cx="25" cy="20" r="4.5" {...s} />
      <circle cx="25" cy="20" r="9"   stroke={color} fill="none" strokeWidth={1} opacity={0.5} />
    </svg>
  )
  if (stepNum === 5) return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="9"  cy="20" r="4" fill={color} />
      <circle cx="31" cy="20" r="4" fill={color} />
      <line x1="13" y1="20" x2="27" y2="20" stroke={color} strokeWidth="1.5" strokeDasharray="2.5 2" strokeLinecap="round" />
      <circle cx="20" cy="20" r="2" fill={color} opacity="0.45" />
    </svg>
  )
  // Step1 default
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <path d="M20 6 L22 14 L30 14 L24 19 L26 28 L20 22 L14 28 L16 19 L10 14 L18 14 Z"
            stroke={color} fill="none" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

// ── ステップ別カラーテーマ ─────────────────────────────────────────────────────

type StepTheme = {
  bg: string; cardBg: string; cardBorder: string
  badgeBg: string; badgeColor: string; badgeBorder: string
  nextHereBg: string; nextHereColor: string
  titleColor: string; descColor: string
  icon: string; iconColor: string
  glowColor: string
}

const STEP_THEMES: Record<number, StepTheme> = {
  1: { bg:'#07070f', cardBg:'#0d0d1a', cardBorder:'#2a2a4e',
       badgeBg:'#1a1a3e', badgeColor:'#8a7aff', badgeBorder:'#3a3a6e',
       nextHereBg:'#2a1a5e', nextHereColor:'#b090ff',
       titleColor:'#e8e8ff', descColor:'#7070b0',
       icon:'✦', iconColor:'#6050d0', glowColor:'rgba(100,80,220,0.15)' },
  2: { bg:'#07070f', cardBg:'#0d0d1a', cardBorder:'#2a2a4e',
       badgeBg:'#1a1a3e', badgeColor:'#8a7aff', badgeBorder:'#3a3a6e',
       nextHereBg:'#2a1a5e', nextHereColor:'#b090ff',
       titleColor:'#e8e8ff', descColor:'#7070b0',
       icon:'✦', iconColor:'#6050d0', glowColor:'rgba(100,80,220,0.15)' },
  3: { bg:'#080600', cardBg:'#0f0d08', cardBorder:'#3a2a0e',
       badgeBg:'#1e1608', badgeColor:'#c9a84c', badgeBorder:'#4a3a1e',
       nextHereBg:'#3a2a08', nextHereColor:'#e0c070',
       titleColor:'#f0e8d0', descColor:'#806040',
       icon:'🎨', iconColor:'', glowColor:'rgba(200,160,60,0.12)' },
  4: { bg:'#040809', cardBg:'#080f10', cardBorder:'#0e3a3e',
       badgeBg:'#081e20', badgeColor:'#40c0c8', badgeBorder:'#0e4a50',
       nextHereBg:'#083040', nextHereColor:'#60d8e0',
       titleColor:'#d0f0f4', descColor:'#307080',
       icon:'◎', iconColor:'#40c0c8', glowColor:'rgba(40,180,190,0.12)' },
  5: { bg:'#080404', cardBg:'#100808', cardBorder:'#3a0e0e',
       badgeBg:'#200808', badgeColor:'#e07060', badgeBorder:'#4a1e1e',
       nextHereBg:'#300808', nextHereColor:'#f09080',
       titleColor:'#f4d0c8', descColor:'#804040',
       icon:'∞', iconColor:'#e07060', glowColor:'rgba(220,100,80,0.12)' },
}

// ── メディアコンポーネント（mp4・gif → 自動再生、png → 静止画、なし → プレースホルダー）─

const MEDIA_STYLE = { width: '100%', height: '100%', objectFit: 'contain' as const, display: 'block' }

function Placeholder() {
  return (
    <div style={{
      width: '100%', height: '100%', borderRadius: 12,
      background: 'rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 32, opacity: 0.3 }}>🖼️</span>
    </div>
  )
}

function StepMedia({ image, video, alt }: { image: string; video?: string; alt: string }) {
  const [videoError, setVideoError] = useState(false)
  const [imageError, setImageError] = useState(false)

  if (imageError) return <Placeholder />

  // gif は <img> で自動アニメーション
  const isGif = video?.toLowerCase().endsWith('.gif')

  if (video && !videoError) {
    if (isGif) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={video} alt={alt} onError={() => setVideoError(true)} style={MEDIA_STYLE} />
      )
    }
    // mp4 は <video> で自動再生
    return (
      <video
        src={video}
        autoPlay muted loop playsInline
        onError={() => setVideoError(true)}
        style={MEDIA_STYLE}
      />
    )
  }

  // fallback: png 静止画
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt={alt} onError={() => setImageError(true)} style={MEDIA_STYLE} />
  )
}

// ── メインページ ───────────────────────────────────────────────────────────────

export default function StepsPreviewPage() {
  const router = useRouter()
  const [queryStep,   setQueryStep]   = useState(DEFAULT_STEP)
  const [activeIndex, setActiveIndex] = useState(STEP_CONFIG[DEFAULT_STEP].startIndex)
  const [btnPressed,  setBtnPressed]  = useState(false)
  const [pressedDot,  setPressedDot]  = useState<number | null>(null)
  const pointerStartX = useRef<number | null>(null)

  useEffect(() => {
    const s = parseInt(new URLSearchParams(window.location.search).get('step') ?? String(DEFAULT_STEP), 10)
    const valid = [1, 2, 3].includes(s) ? s : DEFAULT_STEP
    setQueryStep(valid)
    setActiveIndex(STEP_CONFIG[valid].startIndex)
  }, [])

  const goTo = (index: number) => {
    if (index < 0 || index >= STEPS.length) return
    setActiveIndex(index)
  }

  // スワイプ検知
  const onPointerDown = (e: React.PointerEvent) => {
    pointerStartX.current = e.clientX
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (pointerStartX.current === null) return
    const diff = pointerStartX.current - e.clientX
    if (Math.abs(diff) > 40) {
      diff > 0 ? goTo(activeIndex + 1) : goTo(activeIndex - 1)
    }
    pointerStartX.current = null
  }

  const step        = STEPS[activeIndex]
  const initialIdx  = STEP_CONFIG[queryStep].thresholdIdx
  const destination = STEP_CONFIG[queryStep].destination
  const isLast      = activeIndex === STEPS.length - 1
  const isCurrent   = activeIndex === initialIdx   // 「今ここ」バッジ表示
  const showStart   = activeIndex >= initialIdx || isLast  // 「はじめる」表示
  const theme = STEP_THEMES[step.step] ?? STEP_THEMES[2]

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', height: '100svh',
        maxWidth: 390, margin: '0 auto',
        background: (step.kind === 'jitsu' || step.kind === 'ne') ? '#F7F3ED' : theme.bg, overflow: 'hidden',
        transition: 'background 0.4s ease',
      }}
    >
      <style>{`
        @keyframes cardEnter {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* ── カードエリア（スワイプ可） ── */}
      <div
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
                 padding: step.kind === 'jitsu' || step.kind === 'ne' ? 0 : '12px 16px 0',
                 touchAction: 'pan-y', justifyContent: 'center' }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {(step.kind === 'jitsu' || step.kind === 'ne') ? (

          /* ══════════════════════════════════════════════════════════════
             ウェルカム画面と同じ植物背景（実 or 根）
          ══════════════════════════════════════════════════════════════ */
          <div key={activeIndex} style={{
            flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden',
            background: '#F7F3ED', animation: 'cardEnter 0.2s ease',
          }}>

            {/* ── 地上・地下の背景ゾーン（ウェルカム画面と同一）── */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              <div style={{ height: '60%', background: '#F0EBE0' }} />
              <div style={{ height: '40%', background: '#E8DCC8' }} />
              {/* 土の波線 */}
              <svg viewBox="0 0 480 28" preserveAspectRatio="none"
                style={{ position: 'absolute', top: 'calc(60% - 14px)', left: 0, width: '100%' }}>
                <path d="M0 14 Q24 4 48 14 Q72 24 96 14 Q120 4 144 14 Q168 24 192 14 Q216 4 240 14 Q264 24 288 14 Q312 4 336 14 Q360 24 384 14 Q408 4 432 14 Q456 24 480 14 L480 28 L0 28 Z"
                  fill="#C4B090" opacity="0.55"/>
                <path d="M0 14 Q24 4 48 14 Q72 24 96 14 Q120 4 144 14 Q168 24 192 14 Q216 4 240 14 Q264 24 288 14 Q312 4 336 14 Q360 24 384 14 Q408 4 432 14 Q456 24 480 14"
                  fill="none" stroke="#C4B090" strokeWidth="2.5"/>
              </svg>
            </div>

            {/* ── 植物イラスト（ウェルカム画面と同一・静止版）── */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
              <svg width="320" height="380" viewBox="0 0 320 380" style={{ overflow: 'visible', marginTop: '-20px' }}>
                {/* 根（どっしり広がる）*/}
                <g>
                  <path d="M160 195 Q158 255 157 315 Q156 375 155 435"
                    fill="none" stroke="#6B4F12" strokeWidth="5" strokeLinecap="round"/>
                  <path d="M158 235 Q125 265 95 305 Q70 340 53 380"
                    fill="none" stroke="#6B4F12" strokeWidth="4" strokeLinecap="round"/>
                  <path d="M160 235 Q193 265 223 305 Q248 340 265 380"
                    fill="none" stroke="#6B4F12" strokeWidth="4" strokeLinecap="round"/>
                  <path d="M95 305 Q70 325 47 357 Q30 383 23 415"
                    fill="none" stroke="#8B6914" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M95 305 Q83 340 77 370"
                    fill="none" stroke="#8B6914" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M223 305 Q248 325 271 357 Q288 383 295 415"
                    fill="none" stroke="#8B6914" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M223 305 Q235 340 241 370"
                    fill="none" stroke="#8B6914" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M53 380 Q37 395 27 417"
                    fill="none" stroke="#A0791A" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M47 357 Q30 367 20 385"
                    fill="none" stroke="#A0791A" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M155 435 Q140 453 133 475"
                    fill="none" stroke="#A0791A" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M155 435 Q170 453 177 475"
                    fill="none" stroke="#A0791A" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M265 380 Q281 395 291 417"
                    fill="none" stroke="#A0791A" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M271 357 Q288 367 298 385"
                    fill="none" stroke="#A0791A" strokeWidth="1.2" strokeLinecap="round"/>
                </g>
                {/* 茎 */}
                <line x1="160" y1="195" x2="160" y2="36" stroke="#4A7C59" strokeWidth="4" strokeLinecap="round"/>
                {/* 葉 */}
                <g>
                  <path d="M158 140 Q115 115 98 135 Q110 155 155 148 Z" fill="#6BAF7A"/>
                  <path d="M162 100 Q205 72 224 92 Q210 112 165 108 Z" fill="#6BAF7A"/>
                  <path d="M159 72 Q135 58 128 72 Q138 84 160 78 Z" fill="#5E9E6A"/>
                </g>
                {/* 実 */}
                <g>
                  <circle cx="118" cy="122" r="16" fill="#D85A30"/>
                  <path d="M118 106 Q112 100 108 104" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="196" cy="88" r="14" fill="#D85A30"/>
                  <path d="M196 74 Q191 68 188 72" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="140" cy="62" r="10" fill="#C44D28"/>
                  <path d="M140 52 Q136 47 133 50" fill="none" stroke="#4A7C59" strokeWidth="1.5" strokeLinecap="round"/>
                </g>
              </svg>
            </div>

            {/* ── 説明カード ── */}
            <div style={{
              position: 'absolute', zIndex: 2,
              // 実スライド：地下エリア（土の下）に配置
              // 根スライド：地上エリア（土の上）に配置
              ...(step.kind === 'jitsu'
                ? { bottom: 20, left: '50%', transform: 'translateX(-50%)' }
                : { top: 80, left: '50%', transform: 'translateX(-50%)' }
              ),
              width: 300,
              background: 'rgba(255,250,240,0.92)',
              border: '1px solid rgba(180,150,100,0.2)',
              borderRadius: 16, padding: '20px 22px',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}>
              {/* バッジ行 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                  color: '#534AB7', background: '#e8e0f0',
                  padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(83,74,183,0.2)',
                }}>STEP {step.step}</span>
                {isCurrent && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                    color: '#3B6D11', background: '#e0ede0',
                    padding: '2px 8px', borderRadius: 20,
                  }}>次ここ</span>
                )}
              </div>

              {step.kind === 'jitsu' ? (
                <>
                  <p style={{ color: '#BA7517', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textAlign: 'center', margin: '0 0 8px' }}>実（み）</p>
                  <p style={{ color: '#5a4a30', fontSize: 12, lineHeight: 1.9, textAlign: 'center', margin: '0 0 10px', whiteSpace: 'pre-line' }}>
                    {'あなたが自然と外に出している言葉。\n好きなこと、大切にしていること。\n地上に咲いた、あなたの自分。'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {['# 人と話すのが好き', '# 丁寧に生きたい'].map(t => (
                      <span key={t} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, background: 'rgba(186,117,23,0.1)', color: '#854F0B' }}>{t}</span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p style={{ color: '#8B6914', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textAlign: 'center', margin: '0 0 8px' }}>根（ね）</p>
                  <p style={{ color: '#5a4530', fontSize: 12, lineHeight: 1.9, textAlign: 'center', margin: '0 0 10px', whiteSpace: 'pre-line' }}>
                    {'あなたが心の中にしまっている言葉。\nなかなか言えなかった本音、\n気づいていなかった自分。\n根の言葉は、同じものを持つ人にしか届かない。'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', opacity: 0.85 }}>
                    {['# 認められたい', '# 本当は甘えたい'].map(t => (
                      <span key={t} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, background: 'rgba(139,105,20,0.1)', color: '#633806' }}>{t}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>

        ) : (

          /* ── 通常テーマカード ── */
          <div key={activeIndex} style={{
            position: 'relative',
            borderRadius: 16, padding: '36px 28px',
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            overflow: 'hidden',
            transition: 'background 0.4s ease, border-color 0.4s ease',
            animation: 'cardEnter 0.2s ease',
          }}>
            {/* グロー装飾（右上） */}
            <div style={{
              position: 'absolute', top: 0, right: 0, width: '60%', height: '50%',
              background: `radial-gradient(circle at 90% 0%, ${theme.glowColor} 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />

            {/* バッジ行 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20, position: 'relative' }}>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                color: theme.badgeColor, background: theme.badgeBg,
                padding: '3px 10px', borderRadius: 20, border: `1px solid ${theme.badgeBorder}`,
              }}>STEP {step.step}</span>
              {isCurrent && (
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  color: theme.nextHereColor, background: theme.nextHereBg,
                  padding: '2px 8px', borderRadius: 20,
                }}>次ここ</span>
              )}
            </div>

            {/* アイコン */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, position: 'relative' }}>
              <StepIcon stepNum={step.step} color={theme.iconColor || theme.badgeColor} />
            </div>

            {/* タイトル */}
            <h2 style={{
              fontSize: 22, fontWeight: 500, lineHeight: 1.35, color: theme.titleColor,
              marginBottom: 16, position: 'relative', textAlign: 'center', transition: 'color 0.3s ease',
            }}>
              {step.title}
            </h2>

            {/* 説明文 */}
            <p style={{
              fontSize: 13, lineHeight: 1.8, color: theme.descColor,
              whiteSpace: 'pre-line', position: 'relative', textAlign: 'center', transition: 'color 0.3s ease',
            }}>
              {step.desc}
            </p>
          </div>

        )}
      </div>

      {/* ── 下部：ドット + ボタン ── */}
      <div style={{ flexShrink: 0, padding: '16px 20px 36px' }}>

        {/* ドットインジケーター */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                goTo(i)
                setPressedDot(i)
                setTimeout(() => setPressedDot(null), 150)
              }}
              style={{
                width:  i === activeIndex ? 20 : 6,
                height: 6,
                borderRadius: 3,
                border: 'none', cursor: 'pointer', padding: 0,
                background: i === activeIndex
                  ? 'white'
                  : i === initialIdx
                    ? 'rgba(255,255,255,0.4)'
                    : 'rgba(255,255,255,0.18)',
                transform: pressedDot === i ? 'scale(1.3)' : 'scale(1)',
                transition: 'width 0.2s ease, background 0.2s ease, transform 0.15s ease',
              }}
            />
          ))}
        </div>

        {/* はじめる ボタン（現在地 or 最後のカードで表示） */}
        {showStart ? (
          <button
            onClick={() => router.push(destination)}
            onMouseDown={() => setBtnPressed(true)}
            onMouseUp={() => setBtnPressed(false)}
            onMouseLeave={() => setBtnPressed(false)}
            onTouchStart={() => setBtnPressed(true)}
            onTouchEnd={() => setBtnPressed(false)}
            style={{
              width: '100%', padding: '16px', borderRadius: 30, border: 'none',
              background: step.kind === 'ne' ? '#4A7C59' : 'white',
              color:      step.kind === 'ne' ? '#ffffff'  : '#0d0c18',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              boxShadow: step.kind === 'ne'
                ? '0 4px 16px rgba(74,124,89,0.35)'
                : '0 4px 20px rgba(255,255,255,0.15)',
              transform: btnPressed ? 'scale(0.96)' : 'scale(1)',
              opacity:   btnPressed ? 0.8 : 1,
              transition: 'transform 0.1s ease, opacity 0.1s ease',
            }}
          >
            はじめる →
          </button>
        ) : (
          <button
            onClick={() => goTo(activeIndex + 1)}
            onMouseDown={() => setBtnPressed(true)}
            onMouseUp={() => setBtnPressed(false)}
            onMouseLeave={() => setBtnPressed(false)}
            onTouchStart={() => setBtnPressed(true)}
            onTouchEnd={() => setBtnPressed(false)}
            style={{
              width: '100%', padding: '16px', borderRadius: 30, border: 'none',
              background: step.kind === 'jitsu'
                ? '#4A7C59'
                : STEPS[activeIndex + 1]?.kind === 'jitsu'
                  ? '#ffffff' : 'rgba(255,255,255,0.10)',
              color: step.kind === 'jitsu'
                ? '#ffffff'
                : STEPS[activeIndex + 1]?.kind === 'jitsu'
                  ? '#000000' : 'rgba(255,255,255,0.55)',
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
              transform: btnPressed ? 'scale(0.96)' : 'scale(1)',
              opacity:   btnPressed ? 0.8 : 1,
              transition: 'transform 0.1s ease, opacity 0.1s ease',
            }}
          >
            {STEPS[activeIndex + 1]?.kind === 'jitsu' ? '実と根とは？' : '次へ →'}
          </button>
        )}
      </div>
    </div>
  )
}
