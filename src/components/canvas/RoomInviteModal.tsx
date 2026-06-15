'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DaisyIcon } from '@/src/components/icons/DaisyIcon'

type Step = 'light' | 'shadow'

export function RoomInviteModal({
  onDismiss,
  onShadowDecline,
  initialStep = 'light',
}: {
  onDismiss:       () => void
  onShadowDecline: () => void
  initialStep?:    Step
}) {
  const router  = useRouter()
  const [visible, setVisible] = useState(false)
  const [step,    setStep]    = useState<Step>(initialStep)

  // フェードイン
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  const dismiss = () => {
    setVisible(false)
    setTimeout(onDismiss, 380)
  }

  const go = (path: string) => router.push(path)

  const toShadow = () => setStep('shadow')

  const isLight = step === 'light'

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: visible ? 'rgba(0,0,0,0.68)' : 'rgba(0,0,0,0)',
        transition: 'background 0.4s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          opacity:    visible ? 1 : 0,
          transform:  visible ? 'translateY(0px)' : 'translateY(20px)',
          background: '#FFFFFF',
          borderRadius: 20,
          padding: '36px 24px',
          width: '100%', maxWidth: 320,
          textAlign: 'center',
          border: 'none',
          boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
          transition: 'opacity 0.4s ease, transform 0.4s ease, background 0.35s ease',
        }}
      >

        {/* ── 光ステップ ── */}
        {isLight && (
          <>
            <div style={{ margin: '0 0 12px', display: 'flex', justifyContent: 'center' }}>
              <DaisyIcon size={32} stage={4} />
            </div>
            <p style={{
              color: '#3B2F1E', fontSize: 16, fontWeight: 600,
              lineHeight: 1.65, margin: '0 0 28px',
            }}>
              Daisyを訪れてみますか？
            </p>
            <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.55)', margin: '0 0 20px', lineHeight: 1.6 }}>
              あなたと同じアイデンティティを持つ人と<br />話せます！
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => go('/onboarding/room-visit/light')}
                style={{
                  padding: '14px', borderRadius: 30, border: 'none',
                  background: '#4A7C59', color: '#FFFFFF',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >訪れる</button>
              <button
                onClick={toShadow}
                style={{
                  padding: '12px', borderRadius: 30, border: 'none',
                  background: '#C4B49A', color: '#3B2F1E',
                  fontSize: 14, cursor: 'pointer',
                }}
              >訪れない</button>
            </div>
          </>
        )}

        {/* ── 影ステップ ── */}
        {!isLight && (
          <>
            <p style={{ fontSize: 32, margin: '0 0 12px' }}>🌱</p>
            <p style={{
              color: '#3B2F1E', fontSize: 16, fontWeight: 600,
              lineHeight: 1.65, margin: '0 0 28px',
            }}>
              Seedも覗いてみますか？
            </p>
            <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.55)', margin: '0 0 20px', lineHeight: 1.6 }}>
              同じ境遇を持つ人と打ち明けられます！
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => go('/onboarding/room-visit/shadow')}
                style={{
                  padding: '14px', borderRadius: 30, border: 'none',
                  background: '#8B6914', color: '#FFFFFF',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >覗く</button>
              <button
                onClick={onShadowDecline}
                style={{
                  padding: '12px', borderRadius: 30, border: 'none',
                  background: '#C4B49A', color: '#3B2F1E',
                  fontSize: 14, cursor: 'pointer',
                }}
              >一回抜ける</button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
