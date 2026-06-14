'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import { supabase } from '@/src/lib/supabase/client'
import GardenSetupFlow from '@/src/components/garden/GardenSetupFlow'

type SetupTag = { id: string; text: string }

async function fetchSetupTags(userId: string, type: 'light' | 'shadow'): Promise<SetupTag[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('tags') as any)
    .select('id, text')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) console.error(`[GardenSetup] ${type}タグ取得エラー:`, error.message)
  console.log(`[GardenSetup] ${type}Tags:`, data)

  return (data as SetupTag[]) ?? []
}

type StepStatus = 'done' | 'current' | 'future'

const STEP_LABELS = [
  { label: '土を耕す',       desc: 'あなたという畑を、ここに作る',         note: '自分と向き合う準備をする' },
  { label: 'タネを理解する', desc: '4つの問いで、自分という種の性質を知る', note: '4つの問いで自分という種の性質を知る' },
  { label: 'タネを蒔く',     desc: '自分をデザインし、世界に差し出す',       note: '自分の言葉が農園に根付いていく' },
  { label: '農園が広がる',   desc: '同じ土で育つ人と、言葉だけで出会う',     note: '同じ種を持つ人と出会い、向き合い続ける' },
  { label: '実になる',       desc: 'ありのままで収穫される、本当の自分へ',   note: 'ありのままの自分を好きになる' },
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
  const { step: tutorialStep, advanceStep } = useTutorialStep()
  const [currentStep, setCurrentStep] = useState(1)
  const [showGardenIntro, setShowGardenIntro] = useState(false)
  const [showGardenSetup, setShowGardenSetup] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)
  const [lightTags, setLightTags] = useState<SetupTag[]>([])
  const [shadowTags, setShadowTags] = useState<SetupTag[]>([])

  useEffect(() => {
    const s = parseInt(new URLSearchParams(window.location.search).get('step') ?? '1', 10)
    setCurrentStep([1, 2, 3].includes(s) ? s : 1)
  }, [])

  const STEPS = STEP_LABELS.map((item, i): { label: string; desc: string; note: string; status: StepStatus } => ({
    ...item,
    status: i < currentStep ? 'done' : i === currentStep ? 'current' : 'future',
  }))

  // 「あなたが追加したものを広げてみよう🌻」ポップアップの「はじめる」→ 農園セットアップ画面へ
  const handleStartGardenSetup = async () => {
    setSetupLoading(true)
    const userId = sessionStorage.getItem('user_id')
    if (userId) {
      const [light, shadow] = await Promise.all([
        fetchSetupTags(userId, 'light'),
        fetchSetupTags(userId, 'shadow'),
      ])
      setLightTags(light)
      setShadowTags(shadow)
    }
    setSetupLoading(false)
    setShowGardenSetup(true)
  }

  if (showGardenSetup) {
    return (
      <GardenSetupFlow
        lightTags={lightTags}
        shadowTags={shadowTags}
        onComplete={() => {
          setShowGardenSetup(false)
          setShowGardenIntro(false)
          setCurrentStep(3)
          router.replace('/process-map?step=3', { scroll: false })
        }}
      />
    )
  }

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
                  fontSize: 12, color: '#8B6914', marginTop: 4, fontStyle: 'italic',
                }}>
                  {step.note}
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
          if (tutorialStep === 'process_mapping') advanceStep('step_cards')
          if (currentStep === 1) router.push('/onboarding/steps-preview?step=1')
          else if (currentStep === 2) setShowGardenIntro(true)
          else {
            advanceStep('room_nav_arrow')
            router.push('/home')
          }
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

      {/* 農園案内ポップアップ */}
      {showGardenIntro && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#F5F0E8', maxWidth: 390, margin: '0 auto', padding: '0 24px',
          }}
        >
          <div style={{
            width: '100%', background: '#FFFFFF', borderRadius: 20,
            padding: 32, textAlign: 'center',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#3B2F1E', margin: 0 }}>
              あなたが追加したものを広げてみよう🌻
            </h2>
            <p style={{ fontSize: 13, color: '#8B6914', margin: '8px 0 0' }}>
              実と根のタネを、自分の畑に配置していくよ
            </p>
            <button
              onClick={handleStartGardenSetup}
              disabled={setupLoading}
              style={{
                width: '100%', padding: '14px', marginTop: 24,
                borderRadius: 24, border: 'none',
                background: '#4A7C59', color: '#FFFFFF',
                fontSize: 15, fontWeight: 700,
                cursor: setupLoading ? 'default' : 'pointer',
                opacity: setupLoading ? 0.6 : 1,
              }}
            >
              {setupLoading ? '読み込み中...' : 'はじめる'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
