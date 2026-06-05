'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type StepStatus = 'done' | 'current' | 'future'

// 静的ラベル（ステータスは ?step クエリで動的生成）
const STEP_LABELS = [
  { label: 'あなたを登録する',       desc: 'ユーザーネームを決めました' },
  { label: '自分に出会う時',         desc: '4つの問いから自分自身に出会える時' },
  { label: '自分をデコる時',         desc: '自分という人間をデザインできる場所' },
  { label: '共鳴の場が広がる時',     desc: '同じ境遇を持つ人と偶然すれちがう場所。名前も顔も関係ない、言葉だけで共鳴できる' },
  { label: '本物のつながりへ',       desc: 'ありのままの真実が、新しい出会いを生む' },
]

function StepIndicator({ status }: { status: StepStatus }) {
  if (status === 'done') {
    return (
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: '#1a1400', border: '1.5px solid #c9a84c',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, color: '#c9a84c',
      }}>✓</div>
    )
  }
  if (status === 'current') {
    return (
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: '#f0f0f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 0 4px rgba(240,240,240,0.10)',
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#080808' }} />
      </div>
    )
  }
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      border: '1.5px solid #2a2a2a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
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

  // ?step=N → index(N-1) まで 'done'（✓）、index(N) が 'current'（次ここ）、以降が 'future'
  const STEPS = STEP_LABELS.map((item, i): { label: string; desc: string; status: StepStatus } => ({
    ...item,
    status: i < currentStep ? 'done' : i === currentStep ? 'current' : 'future',
  }))

  return (
    <div
      className="flex flex-col min-h-screen px-6 pt-14 pb-10"
      style={{ background: '#080808', maxWidth: 390, margin: '0 auto' }}
    >
      {/* ヘッダー */}
      <div className="mb-10">
        <p style={{ fontSize: 11, letterSpacing: '0.12em', color: '#404040', marginBottom: 8, textTransform: 'uppercase' }}>
          WhyMe でできること
        </p>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f0', lineHeight: 1.4 }}>
          主人公になる、その前に。
        </h1>
      </div>

      {/* ステップ一覧 */}
      <div className="flex flex-col flex-1" style={{ gap: 0 }}>
        {STEPS.map((step, i) => {
          const isDone    = step.status === 'done'
          const isCurrent = step.status === 'current'
          const isFuture  = step.status === 'future'

          return (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', paddingBottom: 28 }}>
              {/* インジケーター + 縦線 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <StepIndicator status={step.status} />
                {i < STEPS.length - 1 && (
                  <div style={{
                    width: 1.5, flex: 1, minHeight: 24, marginTop: 6,
                    background: isDone ? '#c9a84c' : '#1a1a1a',
                  }} />
                )}
              </div>

              {/* テキスト */}
              <div style={{ paddingTop: 4 }}>
                <p style={{
                  fontSize: 15, fontWeight: isCurrent ? 700 : 500,
                  color: isDone    ? '#606060'
                       : isCurrent ? '#f0f0f0'
                       : '#2a2a2a',
                  marginBottom: 3, lineHeight: 1.4,
                }}>
                  {step.label}
                </p>
                <p style={{
                  fontSize: 12,
                  color: isDone    ? '#404040'
                       : isCurrent ? '#a0a0a0'
                       : '#1a1a1a',
                  lineHeight: 1.5,
                }}>
                  {step.desc}
                </p>
                {isCurrent && (
                  <span style={{
                    display: 'inline-block', marginTop: 6,
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                    color: '#080808', background: '#f0f0f0',
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
          background: '#f0f0f0', color: '#080808',
          fontSize: 15, fontWeight: 700,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        はじめる →
      </button>
    </div>
  )
}
