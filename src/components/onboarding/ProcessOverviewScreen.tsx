'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  {
    icon: '🌱',
    num: '①',
    title: '自分を理解する',
    desc: '4つの質問に答えて、あなた自身の光と影のタグを見つけよう',
    accent: '#4A7C59',
    bg: '#EBF4ED',
  },
  {
    icon: '🌼',
    num: '②',
    title: '仲間と繋がる',
    desc: '同じタグを持つ仲間が集まるルームで、言葉を交わそう',
    accent: '#B07D20',
    bg: '#FBF4E4',
  },
  {
    icon: '🌸',
    num: '③',
    title: '向き合い、成長する',
    desc: '自分の根と向き合いながら、デイジーを咲かせていこう',
    accent: '#7B5EA7',
    bg: '#F2EEF8',
  },
]

type Props = { onUnderstand: () => void }

export default function ProcessOverviewScreen({ onUnderstand }: Props) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timings = [60, 380, 650, 920, 1400]
    const timers = timings.map((ms, i) => setTimeout(() => setPhase(i + 1), ms))
    return () => timers.forEach(clearTimeout)
  }, [])

  const show = (threshold: number) => ({
    opacity: phase >= threshold ? 1 : 0,
    transform: phase >= threshold ? 'translateY(0)' : 'translateY(14px)',
    transition: 'opacity 0.55s ease, transform 0.55s ease',
  })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: '#F5F0E8',
        display: 'flex', flexDirection: 'column',
        padding: '0 24px 48px',
        maxWidth: 390, margin: '0 auto',
        overflowY: 'auto',
      }}
    >
      {/* ヘッダー */}
      <div style={{ paddingTop: 64, textAlign: 'center', marginBottom: 36, ...show(1) }}>
        <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 16 }}>🌼</div>
        <h1
          style={{
            fontSize: 26, fontWeight: 800, color: '#3B2F1E',
            lineHeight: 1.5, margin: '0 0 10px',
            letterSpacing: '0.02em',
          }}
        >
          ありのままに、<br />愛でるために
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(59,47,30,0.45)', margin: 0 }}>
          この旅の3つのステップ
        </p>
      </div>

      {/* ステップカード */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {STEPS.map(({ icon, num, title, desc, accent, bg }, i) => (
          <div key={num}>
            <div
              style={{
                background: bg,
                borderRadius: 18,
                padding: '18px 20px',
                display: 'flex', alignItems: 'flex-start', gap: 16,
                ...show(i + 2),
              }}
            >
              {/* アイコン+番号 */}
              <div
                style={{
                  width: 54, height: 54, borderRadius: 14,
                  background: '#FFFFFF',
                  boxShadow: `0 3px 10px ${accent}28`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, gap: 2,
                }}
              >
                <span style={{ fontSize: 24, lineHeight: 1 }}>{icon}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: accent }}>{num}</span>
              </div>

              {/* テキスト */}
              <div style={{ flex: 1, paddingTop: 5 }}>
                <p style={{
                  fontSize: 16, fontWeight: 700, color: '#3B2F1E',
                  margin: '0 0 5px', lineHeight: 1.35,
                }}>
                  {title}
                </p>
                <p style={{
                  fontSize: 13, color: 'rgba(59,47,30,0.6)',
                  margin: 0, lineHeight: 1.7,
                }}>
                  {desc}
                </p>
              </div>
            </div>

            {/* 矢印コネクター */}
            {i < STEPS.length - 1 && (
              <div
                style={{
                  display: 'flex', justifyContent: 'center', padding: '10px 0',
                  opacity: phase >= i + 3 ? 0.3 : 0,
                  transition: 'opacity 0.4s ease',
                }}
              >
                <svg width="16" height="22" viewBox="0 0 16 22" fill="none">
                  <line x1="8" y1="1" x2="8" y2="13"
                    stroke="#3B2F1E" strokeWidth="1.5" strokeDasharray="3 2.5" strokeLinecap="round" />
                  <path d="M3 11 L8 17 L13 11"
                    stroke="#3B2F1E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ボタン */}
      <button
        onClick={onUnderstand}
        style={{
          width: '100%', padding: '14px',
          borderRadius: 24, border: 'none',
          background: '#4A7C59', color: '#FFFFFF',
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
          marginTop: 32,
          ...show(5),
        }}
      >
        理解した
      </button>
    </div>
  )
}
