'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// ?step=N → 表示開始カード（配列インデックス）と遷移先のマッピング
// startIndex  : スライドの表示開始位置（最初に見せるカード）
// thresholdIdx: 「はじめる」表示 & 「次ここ」バッジの閾値インデックス
const STEP_CONFIG: Record<number, { startIndex: number; thresholdIdx: number; destination: string }> = {
  1: { startIndex: 1, thresholdIdx: 2, destination: '/onboarding' },            // 「自分に出会う時」→ 光と影 → /onboarding
  2: { startIndex: 3, thresholdIdx: 3, destination: '/onboarding/canvas-light' }, // 「自分をデコる時」→ キャンバス編集へ
  3: { startIndex: 4, thresholdIdx: 4, destination: '/canvas' },                  // 「共鳴の場が広がる時」→ /canvas（Roomポップアップ）
}

// ── ステップデータ ─────────────────────────────────────────────────────────────

type StepStatus = 'done' | 'current' | 'future'
type SlideKind = 'standard' | 'light-shadow'

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
    // ── 光と影の説明スライド（STEP 2 の次）────────────────────────────────────
    step: 2, title: '光と影について',
    desc: '', image: '', status: 'done', kind: 'light-shadow',
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
        background: theme.bg, overflow: 'hidden',
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
                 padding: '12px 16px 0', touchAction: 'pan-y', justifyContent: 'center' }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {/* ── テーマカード ── */}
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
              color: theme.badgeColor,
              background: theme.badgeBg,
              padding: '3px 10px', borderRadius: 20,
              border: `1px solid ${theme.badgeBorder}`,
            }}>STEP {step.step}</span>
            {isCurrent && (
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                color: theme.nextHereColor, background: theme.nextHereBg,
                padding: '2px 8px', borderRadius: 20,
              }}>次ここ</span>
            )}
          </div>

          {step.kind === 'light-shadow' ? (
            /* ── 光と影の説明スライド ── */
            <div style={{ position: 'relative' }}>
              {/* 光ラベル */}
              <p style={{ color: '#EF9F27', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textAlign: 'center', margin: '0 0 12px' }}>光</p>
              {/* 光テキスト */}
              <p style={{ color: '#b0aac0', fontSize: 14, lineHeight: 1.8, textAlign: 'center', margin: 0, whiteSpace: 'pre-line' }}>
                {'あなたが自然と外に出している言葉。\n好きなこと、大切にしていること。\nそれはあなたの明るみにある自分。'}
              </p>
              {/* 区切り線 */}
              <div style={{ width: '100%', height: '0.5px', background: 'rgba(255,255,255,0.15)', margin: '20px 0' }} />
              {/* 影ラベル */}
              <p style={{ color: '#AFA9EC', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textAlign: 'center', margin: '0 0 12px' }}>影</p>
              {/* 影テキスト */}
              <p style={{ color: '#b0aac0', fontSize: 14, lineHeight: 1.8, textAlign: 'center', margin: 0, whiteSpace: 'pre-line' }}>
                {'あなたが心の中にしまっている言葉。\nなかなか言えなかった本音、\n気づいていなかった自分。\n影の言葉は、同じものを持つ人にしか届かない。'}
              </p>
            </div>
          ) : (
            <>
              {/* アイコン */}
              <div style={{
                display: 'flex', justifyContent: 'center',
                marginBottom: 16, position: 'relative',
              }}>
                <StepIcon stepNum={step.step} color={theme.iconColor || theme.badgeColor} />
              </div>

              {/* タイトル */}
              <h2 style={{
                fontSize: 22, fontWeight: 500, lineHeight: 1.35,
                color: theme.titleColor,
                marginBottom: 16, position: 'relative',
                textAlign: 'center',
                transition: 'color 0.3s ease',
              }}>
                {step.title}
              </h2>

              {/* 説明文 */}
              <p style={{
                fontSize: 13, lineHeight: 1.8,
                color: theme.descColor,
                whiteSpace: 'pre-line', position: 'relative',
                textAlign: 'center',
                transition: 'color 0.3s ease',
              }}>
                {step.desc}
              </p>
            </>
          )}
        </div>
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
              background: 'white', color: '#0d0c18',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(255,255,255,0.15)',
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
              background: STEPS[activeIndex + 1]?.kind === 'light-shadow' ? '#ffffff' : 'rgba(255,255,255,0.10)',
              color:      STEPS[activeIndex + 1]?.kind === 'light-shadow' ? '#000000' : 'rgba(255,255,255,0.55)',
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
              transform: btnPressed ? 'scale(0.96)' : 'scale(1)',
              opacity:   btnPressed ? 0.8 : 1,
              transition: 'transform 0.1s ease, opacity 0.1s ease',
            }}
          >
            {STEPS[activeIndex + 1]?.kind === 'light-shadow' ? '光と影とは？' : '次へ →'}
          </button>
        )}
      </div>
    </div>
  )
}
