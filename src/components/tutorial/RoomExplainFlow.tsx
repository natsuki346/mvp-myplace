'use client'

import { useEffect, useState } from 'react'

type RoomExplainFlowProps = {
  page: 0 | 1
  onNext: () => void
}

const PAGES = [
  {
    tagLabel: '🌿 実の部屋',
    tagBg: '#F5D78E',
    tagText: '#4A7C59',
    dots: '● ○',
    title: '光の面でつながる場所',
    description: '自分の得意なこと・好きなことを持つ人たちと話せます。共鳴した言葉がタグになって木に実ります。',
    emphasis: null as string | null,
    buttonLabel: 'チャットしてみる →',
    buttonBg: '#4A7C59',
  },
  {
    tagLabel: '🪨 根の部屋',
    tagBg: '#D4B896',
    tagText: '#8B6914',
    dots: '○ ●',
    title: '影の面を安心して話せる場所',
    description: '弱さや葛藤を、同じ気持ちの人と静かに分かち合えます。',
    emphasis: '部屋に入るだけで、あなたが埋めた種に水が撒かれます。',
    buttonLabel: 'チャットしてみる →',
    buttonBg: '#8B6914',
  },
] as const

export default function RoomExplainFlow({ page, onNext }: RoomExplainFlowProps) {
  const [visible, setVisible] = useState(false)
  const c = PAGES[page]

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  const handleNext = () => {
    setVisible(false)
    setTimeout(onNext, 250)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 260,
        background: visible ? 'rgba(59,47,30,0.55)' : 'rgba(59,47,30,0)',
        transition: 'background 0.3s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
      }}
    >
      <div
        style={{
          opacity:    visible ? 1 : 0,
          transform:  visible ? 'translateY(0px)' : 'translateY(16px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          background: '#FFFFFF',
          borderRadius: 20,
          padding: '36px 24px',
          width: '100%', maxWidth: 320,
          textAlign: 'center',
          boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
        }}
      >
        <span
          className="inline-block rounded-full px-3 py-1 text-xs font-bold mb-3"
          style={{ background: c.tagBg, color: c.tagText }}
        >
          {c.tagLabel}
        </span>
        <p className="text-xs mb-2" style={{ color: '#A89880', letterSpacing: '0.2em' }}>
          {c.dots}
        </p>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E', lineHeight: 1.6, margin: '0 0 12px' }}>
          {c.title}
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.7)', lineHeight: 1.7, margin: '0 0 24px' }}>
          {c.description}
          {c.emphasis && (
            <>
              {' '}
              <span style={{ fontWeight: 500, color: '#8B6914' }}>{c.emphasis}</span>
            </>
          )}
        </p>
        <button
          onClick={handleNext}
          style={{
            width: '100%', padding: '14px', borderRadius: 30, border: 'none',
            background: c.buttonBg, color: '#FFFFFF',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {c.buttonLabel}
        </button>
      </div>
    </div>
  )
}
