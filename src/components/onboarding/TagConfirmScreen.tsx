'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import GrowthTransitionOverlay from '@/src/components/tree/GrowthTransitionOverlay'
import WhyModal from '@/src/components/onboarding/WhyModal'

type Props = {
  lightTags: string[]
  shadowTags: string[]
}

export default function TagConfirmScreen({ lightTags, shadowTags }: Props) {
  const router = useRouter()
  const [showAnimation, setShowAnimation] = useState(false)
  const [showWhyModal, setShowWhyModal] = useState(false)
  const total = lightTags.length + shadowTags.length
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (visibleCount >= total) return
    const t = setTimeout(() => setVisibleCount(n => n + 1), 100)
    return () => clearTimeout(t)
  }, [visibleCount, total])

  const normalize = (text: string) => text.replace(/^#+/, '')

  const Chip = ({ text, index, bg }: { text: string; index: number; bg: string }) => (
    <span
      style={{
        display: 'inline-block',
        padding: '8px 16px',
        borderRadius: 9999,
        background: bg,
        color: '#3B2F1E',
        fontSize: 14,
        fontWeight: 600,
        opacity: index < visibleCount ? 1 : 0,
        transform: index < visibleCount ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      #{normalize(text)}
    </span>
  )

  return (
    <>
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        maxWidth: 390, margin: '0 auto',
        background: '#F5F0E8',
        display: 'flex', flexDirection: 'column',
        padding: '0 24px 40px',
        overflowY: 'auto',
      }}
    >
      <div style={{ paddingTop: 60, flex: 1 }}>
        <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.45)', textAlign: 'center', marginBottom: 36, letterSpacing: '0.04em' }}>
          登録されたタグ
        </p>

        {/* Light タグ */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>🌼</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>Daisy</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {lightTags.map((tag, i) => (
              <Chip key={i} text={tag} index={i} bg="#F5D78E" />
            ))}
          </div>
        </div>

        {/* Shadow タグ */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>🌱</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>Seed</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {shadowTags.map((tag, i) => (
              <Chip key={i} text={tag} index={lightTags.length + i} bg="#D4B896" />
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowAnimation(true)}
        style={{
          width: '100%', padding: '14px',
          borderRadius: 24, border: 'none',
          background: '#4A7C59', color: '#FFFFFF',
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        これが自分！
      </button>
    </div>

    {showAnimation && (
      <GrowthTransitionOverlay
        stage="sprout"
        quote={{ text: '自分を知ることが、\nすべての知恵の始まりだ。', author: 'アリストテレス' }}
        message={{ title: '言葉にできてすごい💯' }}
        buttonText="次へ"
        onNext={() => setShowWhyModal(true)}
      />
    )}

    {showWhyModal && (
      <WhyModal
        currentStep={2}
        onStart={() => { setShowAnimation(false); setShowWhyModal(false); router.push('/home') }}
      />
    )}

    </>
  )
}
