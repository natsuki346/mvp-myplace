'use client'

// ── オンボーディング④：HELP / Rescue 説明画面 ───────────────────────────────
// この後のモード選択（/mode）で「どちらで参加するか」を選ぶ前に、
// HELP（話を聞いてもらう側）と Rescue（話を聞く側）の2つの役割を説明する。
// 「次へ」でモード選択（/mode）へ。onboarded_at の確定はモード選択時。

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const CARDS: {
  key: string
  emoji: string
  title: string
  sub: string
  body: string
  accent: string
  bg: string
}[] = [
  {
    key: 'help',
    emoji: '🤝',
    title: 'HELP',
    sub: '話を聞いてもらう',
    body: '同じ経験をした人に、今すぐ話を聞いてもらえます。チャット・通話・対面から選べます。',
    accent: '#4A7C59',
    bg: '#E9F1E5',
  },
  {
    key: 'rescue',
    emoji: '🌿',
    title: 'Rescue',
    sub: '話を聞いてあげる',
    body: 'あなたの経験を活かして、悩んでいる人の話を聞けます。誰かの力になることで、自分も成長できます。',
    accent: '#C9A84C',
    bg: '#FBF3D9',
  },
]

export default function AboutRolesPage() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  const goNext = () => router.replace('/mode')

  return (
    <div style={{ background: '#F5F0E8', height: '100svh', overflowY: 'auto' }}>
      <div style={{
        maxWidth: 390, margin: '0 auto', boxSizing: 'border-box',
        minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 'calc(28px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom))',
        opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease',
      }}>
        <h1 style={{
          fontSize: 22, fontWeight: 700, color: '#3B2F1E',
          lineHeight: 1.6, margin: '0 0 6px', textAlign: 'center',
        }}>
          DaiMe には<br />2つの参加のしかたがあります
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.55)', margin: '0 0 28px', textAlign: 'center' }}>
          その日の気分で、どちらでも選べます
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {CARDS.map(c => (
            <div
              key={c.key}
              style={{
                background: c.bg, borderRadius: 16, padding: '18px 18px 20px',
                border: `1.5px solid ${c.accent}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 26, lineHeight: 1 }}>{c.emoji}</span>
                <span>
                  <span style={{ display: 'block', fontSize: 17, fontWeight: 800, color: c.accent, letterSpacing: 0.5 }}>
                    {c.title}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(59,47,30,0.55)', marginTop: 1 }}>
                    {c.sub}
                  </span>
                </span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#3B2F1E', margin: 0 }}>
                {c.body}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={goNext}
          style={{
            marginTop: 36, width: '100%', padding: '15px 0', borderRadius: 26, border: 'none',
            background: '#4A7C59', color: '#F5F0E8', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          次へ
        </button>
      </div>
    </div>
  )
}
