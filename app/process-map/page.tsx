'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type StepStatus = 'done' | 'current' | 'future'

const STEP_LABELS = [
  { label: '土を耕す',       desc: 'あなたという畑を、ここに作る' },
  { label: 'タネを理解する', desc: '4つの問いで、自分という種の性質を知る' },
  { label: 'タネを蒔く',     desc: '自分をデザインし、世界に差し出す' },
  { label: '農園が広がる',   desc: '同じ土で育つ人と、言葉だけで出会う' },
  { label: '実になる',       desc: 'ありのままで収穫される、本当の自分へ' },
]

// ステップごとの色（土→種→新芽→葉→実）
const STEP_COLORS = ['#8B6914', '#C4A35A', '#4A7C59', '#6B9E78', '#C0392B']

function StepIndicator({ status, color }: { status: StepStatus; color: string }) {
  if (status === 'done') {
    return (
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: color + '22',
        border: `1.5px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, color: color,
      }}>✓</div>
    )
  }
  if (status === 'current') {
    return (
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 0 4px ${color}30`,
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffffff' }} />
      </div>
    )
  }
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      border: `1.5px solid ${color}50`,
    }} />
  )
}

export default function ProcessMapPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    const s = parseInt(new URLSearchParams(window.location.search).get('step') ?? '1', 10)
    setCurrentStep([1, 2, 3].includes(s) ? s : 1)
  }, [])

  const STEPS = STEP_LABELS.map((item, i): { label: string; desc: string; status: StepStatus } => ({
    ...item,
    status: i < currentStep ? 'done' : i === currentStep ? 'current' : 'future',
  }))

  return (
    <div
      className="flex flex-col min-h-screen px-6 pt-14 pb-10"
      style={{ background: '#F5F0E8', maxWidth: 390, margin: '0 auto' }}
    >
      {/* ヘッダー */}
      <div className="mb-10">
        <p style={{ fontSize: 11, letterSpacing: '0.12em', color: '#8B7355', marginBottom: 8 }}>
          あなたという畑の、物語。
        </p>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#3B2F1E', lineHeight: 1.4 }}>
          種を蒔くところから、始めよう。
        </h1>
      </div>

      {/* ステップ一覧 */}
      <div className="flex flex-col flex-1" style={{ gap: 0 }}>
        {STEPS.map((step, i) => {
          const isDone    = step.status === 'done'
          const isCurrent = step.status === 'current'
          const color     = STEP_COLORS[i]

          return (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', paddingBottom: 28 }}>
              {/* インジケーター + 縦線（茎） */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <StepIndicator status={step.status} color={color} />
                {i < STEPS.length - 1 && (
                  <div style={{
                    width: 1.5, flex: 1, minHeight: 24, marginTop: 6,
                    background: isDone ? '#4A7C59' : 'rgba(74,124,89,0.2)',
                  }} />
                )}
              </div>

              {/* テキスト */}
              <div style={{ paddingTop: 4 }}>
                <p style={{
                  fontSize: 15, fontWeight: isCurrent ? 700 : 500,
                  color: isDone    ? '#8B7355'
                       : isCurrent ? '#3B2F1E'
                       : '#B0A080',
                  marginBottom: 3, lineHeight: 1.4,
                }}>
                  {step.label}
                </p>
                <p style={{
                  fontSize: 12,
                  color: isDone    ? '#A0876A'
                       : isCurrent ? '#7A6040'
                       : '#C0A880',
                  lineHeight: 1.5,
                }}>
                  {step.desc}
                </p>
                {isCurrent && (
                  <span style={{
                    display: 'inline-block', marginTop: 6,
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                    color: '#ffffff', background: '#4A7C59',
                    padding: '2px 8px', borderRadius: 20,
                  }}>次ここ</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* CTA ボタン */}
      <button
        onClick={() => {
          if (currentStep === 1) router.push('/onboarding/steps-preview?step=1')
          else if (currentStep === 2) router.push('/onboarding/steps-preview?step=2')
          else router.push('/onboarding/steps-preview?step=3')
        }}
        style={{
          width: '100%', padding: '16px',
          borderRadius: 30, border: 'none', cursor: 'pointer',
          background: '#4A7C59', color: '#ffffff',
          fontSize: 15, fontWeight: 700,
          boxShadow: '0 4px 16px rgba(74,124,89,0.35)',
        }}
      >
        はじめる →
      </button>
    </div>
  )
}
