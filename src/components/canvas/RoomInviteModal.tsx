'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
          background: isLight ? 'white' : '#1a1a2e',
          borderRadius: 20,
          padding: '36px 24px',
          width: '100%', maxWidth: 320,
          textAlign: 'center',
          border: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(167,139,250,0.25)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
          transition: 'opacity 0.4s ease, transform 0.4s ease, background 0.35s ease',
        }}
      >

        {/* ── 光ステップ ── */}
        {isLight && (
          <>
            <p style={{ fontSize: 32, margin: '0 0 12px' }}>☀️</p>
            <p style={{
              color: '#1a1a1a', fontSize: 16, fontWeight: 600,
              lineHeight: 1.65, margin: '0 0 28px',
            }}>
              光の部屋を訪れてみますか？
            </p>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', margin: '0 0 20px', lineHeight: 1.6 }}>
              あなたと同じアイデンティティを持つ人と話せます！
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => go('/room/light')}
                style={{
                  padding: '14px', borderRadius: 30, border: 'none',
                  background: '#1a1a1a', color: 'white',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >訪れる</button>
              <button
                onClick={toShadow}
                style={{
                  padding: '12px', borderRadius: 30, border: 'none',
                  background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.5)',
                  fontSize: 14, cursor: 'pointer',
                }}
              >訪れない</button>
            </div>
          </>
        )}

        {/* ── 影ステップ ── */}
        {!isLight && (
          <>
            <p style={{ fontSize: 32, margin: '0 0 12px' }}>🌙</p>
            <p style={{
              color: 'white', fontSize: 16, fontWeight: 600,
              lineHeight: 1.65, margin: '0 0 28px',
            }}>
              影の部屋も覗いてみますか？
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', margin: '0 0 20px', lineHeight: 1.6 }}>
              同じ境遇を持つ人と打ち明けられます！
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => go('/room/shadow')}
                style={{
                  padding: '14px', borderRadius: 30, border: 'none',
                  background: 'white', color: '#1a1a1a',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >覗く</button>
              <button
                onClick={onShadowDecline}
                style={{
                  padding: '12px', borderRadius: 30, border: 'none',
                  background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)',
                  fontSize: 14, cursor: 'pointer',
                }}
              >覗かない</button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
