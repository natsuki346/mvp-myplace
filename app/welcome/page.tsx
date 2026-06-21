'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import WhyModal from '@/src/components/onboarding/WhyModal'
import ProcessOverviewScreen from '@/src/components/onboarding/ProcessOverviewScreen'
import DaisyFlower from '@/src/components/DaisyFlower'

export default function WelcomePage() {
  const router    = useRouter()
  const [loaded,           setLoaded]           = useState(false)
  const [isLeaving,        setIsLeaving]        = useState(false)
  const [showProcessOverview, setShowProcessOverview] = useState(false)
  const [showWhyModal,     setShowWhyModal]     = useState(false)
  const [showStartPopup,   setShowStartPopup]   = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 60)
    return () => clearTimeout(t)
  }, [])

  const handleStart = () => setShowProcessOverview(true)

  const handleProcessUnderstand = () => {
    setShowProcessOverview(false)
    setShowWhyModal(true)
  }

  const handleWhyStart = () => {
    setShowWhyModal(false)
    setShowStartPopup(true)
  }

  const handleStartPopup = () => {
    setShowStartPopup(false)
    setIsLeaving(true)
    setTimeout(() => router.push('/onboarding'), 900)
  }

  return (
    <>
    <div
      style={{
        width: '100%', maxWidth: 390, margin: '0 auto',
        minHeight: '100svh', background: '#F5F0E8',
        display: 'flex', flexDirection: 'column',
        opacity: isLeaving ? 0 : 1,
        transition: isLeaving ? 'opacity 0.5s ease' : 'none',
      }}
    >
      {/* ── 中央メッセージ + デイジーの開花アニメーション ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '0 24px' }}>
        <p style={{
          fontSize: 28, fontWeight: 700, color: '#E0708A',
          textAlign: 'center', lineHeight: 1.7, margin: 0,
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.4s ease 0.3s, transform 0.4s ease 0.3s',
        }}>
          ありのままで<br />つながれる
        </p>
        <div style={{ marginTop: 16 }}>
          <DaisyFlower size={150} animate={loaded} />
        </div>
      </div>

      {/* ── はじめるボタン ── */}
      <div
        style={{
          padding: '0 24px 20px',
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.4s ease 0.5s, transform 0.4s ease 0.5s',
        }}
      >
        <button
          onClick={handleStart}
          style={{
            width: '100%',
            background: '#4A7C59', color: '#F5F0E8',
            border: 'none', borderRadius: 24,
            padding: '14px 0', fontSize: 15, fontWeight: 500,
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

      {/* ── アプリ名 ── */}
      <div
        style={{
          textAlign: 'center', paddingBottom: 48,
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.4s ease 0.6s',
        }}
      >
        <p style={{
          fontSize: 72, fontStyle: 'italic', fontWeight: 600, color: '#3B2F1E', margin: 0,
          fontFamily: "'Cormorant Garamond', serif", letterSpacing: '0.02em',
        }}>
          DaiMe
        </p>
      </div>
    </div>
    {showProcessOverview && <ProcessOverviewScreen onUnderstand={handleProcessUnderstand} />}
    {showWhyModal && <WhyModal onStart={handleWhyStart} currentStep={1} />}
    {showStartPopup && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
        background: 'rgba(59,47,30,0.35)',
      }}>
        <div style={{
          width: '100%', maxWidth: 342,
          background: '#FFFFFF', borderRadius: 20,
          padding: 32, textAlign: 'center',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#3B2F1E', margin: 0 }}>
            まず4つの質問に答えてみよう🌱
          </h2>
          <button
            onClick={handleStartPopup}
            style={{
              width: '100%', padding: '14px', marginTop: 24,
              borderRadius: 24, border: 'none',
              background: '#4A7C59', color: '#FFFFFF',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            はじめる
          </button>
        </div>
      </div>
    )}
    </>
  )
}
