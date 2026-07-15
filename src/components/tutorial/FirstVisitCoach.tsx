'use client'

import { useEffect, useState } from 'react'

export type CoachLine = { icon: string; title: string; desc: string }

type Props = {
  // localStorage のキー。この画面を初めて開いた時だけ表示し、以降は出さない
  storageKey: string
  heading: string
  lines: CoachLine[]
  note?: string
  buttonText?: string
}

// 各画面へ初めて遷移したタイミングで一度だけ出す説明オーバーレイ（コーチマーク）。
// 表示済みかどうかは storageKey ごとに localStorage で管理する。
export default function FirstVisitCoach({ storageKey, heading, lines, note, buttonText = 'わかりました' }: Props) {
  const [show, setShow] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(storageKey)) return
    setShow(true)
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [storageKey])

  if (!show) return null

  const close = () => {
    localStorage.setItem(storageKey, 'true')
    setVisible(false)
    setTimeout(() => setShow(false), 220)
  }

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: visible ? 'rgba(59,47,30,0.55)' : 'rgba(59,47,30,0)',
        transition: 'background 0.25s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 340,
          background: '#F5F0E8', borderRadius: 22, padding: '26px 22px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(14px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#3B2F1E', margin: '0 0 18px', textAlign: 'center' }}>
          {heading}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: note ? 14 : 22 }}>
          {lines.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22, lineHeight: 1.3, flexShrink: 0 }}>{l.icon}</span>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E', margin: '0 0 2px' }}>{l.title}</p>
                <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.65)', margin: 0, lineHeight: 1.6 }}>{l.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {note && (
          <p style={{ fontSize: 11.5, color: 'rgba(59,47,30,0.5)', margin: '0 0 20px', textAlign: 'center', lineHeight: 1.6 }}>
            {note}
          </p>
        )}

        <button
          onClick={close}
          style={{
            width: '100%', padding: '13px', borderRadius: 24, border: 'none',
            background: '#4A7C59', color: '#FFFFFF',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}
