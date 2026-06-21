'use client'

import { useEffect, useRef, useState } from 'react'

const STEPS = [
  { num: '①', label: '自分を理解する' },
  { num: '②', label: '仲間と繋がる' },
  { num: '③', label: '向き合い、成長する' },
]

const BUTTON_LABELS: Record<1 | 2 | 3, string> = {
  1: 'はじめる',
  2: 'はじめる',
  3: '向き合ってみる',
}

const HIGHLIGHT = '#C0392B'
const DONE = '#4A7C59'

type Props = {
  onStart: () => void
  currentStep?: 1 | 2 | 3
  // たった今完了したステップ。指定すると、その番号アイコンが✓に変わるアニメーションを再生する
  completedStep?: 1 | 2 | 3
  // ✓アニメーションの再生が終わったタイミングで呼ばれる（名言ポップアップの表示などに使う）
  onCompletedCheckDone?: () => void
}

export default function WhyModal({ onStart, currentStep, completedStep, onCompletedCheckDone }: Props) {
  const [visible, setVisible] = useState(false)
  const [checkedStep, setCheckedStep] = useState<number | null>(null)
  const onCompletedCheckDoneRef = useRef(onCompletedCheckDone)

  useEffect(() => {
    onCompletedCheckDoneRef.current = onCompletedCheckDone
  }, [onCompletedCheckDone])

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  // モーダルが表示されてひと呼吸おいた後に、完了ステップの番号を✓に切り替える
  useEffect(() => {
    if (!completedStep) return
    const t = setTimeout(() => setCheckedStep(completedStep), 500)
    return () => clearTimeout(t)
  }, [completedStep])

  // ✓のポップアニメーションが終わる頃に完了通知
  useEffect(() => {
    if (checkedStep == null) return
    const t = setTimeout(() => onCompletedCheckDoneRef.current?.(), 700)
    return () => clearTimeout(t)
  }, [checkedStep])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
        background: 'rgba(59,47,30,0.35)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 342,
          background: '#F5F0E8',
          borderRadius: 20,
          padding: '36px 28px 28px',
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'transform 0.4s ease',
        }}
      >
        <style>{`
          @keyframes why-check-pop {
            0%   { transform: scale(0.3); opacity: 0; }
            60%  { transform: scale(1.25); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>

        {/* タイトル */}
        <h2
          style={{
            margin: '0 0 28px',
            fontSize: 22,
            fontWeight: 800,
            color: '#3B2F1E',
            lineHeight: 1.45,
            textAlign: 'center',
            letterSpacing: '0.02em',
          }}
        >
          ありのままに、<br />愛でるために
        </h2>

        {/* ステップ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
          {STEPS.map(({ num, label }, i) => {
            const stepNum = i + 1
            const active  = currentStep === stepNum
            const checked = checkedStep === stepNum
            return (
              <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: checked ? DONE : active ? HIGHLIGHT : '#4A7C59',
                    width: 26,
                    height: 26,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {checked ? (
                    <svg
                      width="20" height="20" viewBox="0 0 20 20" fill="none"
                      style={{ animation: 'why-check-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both' }}
                    >
                      <circle cx="10" cy="10" r="10" fill={DONE} />
                      <path d="M5.5 10.3L8.3 13L14.5 6.8" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    num
                  )}
                </span>
                <span style={{ fontSize: 15, fontWeight: 600, color: checked ? '#3B2F1E' : active ? HIGHLIGHT : '#3B2F1E', flex: 1 }}>
                  {label}
                </span>
                {active && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: HIGHLIGHT,
                      border: `1px solid ${HIGHLIGHT}`,
                      borderRadius: 4,
                      padding: '1px 5px',
                      lineHeight: 1.4,
                      flexShrink: 0,
                    }}
                  >
                    次ここ
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <button
          onClick={onStart}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 24,
            border: 'none',
            background: '#4A7C59',
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {currentStep ? BUTTON_LABELS[currentStep] : 'はじめる'}
        </button>
      </div>
    </div>
  )
}
