'use client'

import { useEffect, useState } from 'react'
import { TreeSVG, RootsSVG, useMounted, loadGardenData } from '@/app/onboarding/garden-setup/garden-visuals'
import { DaisyIcon } from '@/src/components/icons/DaisyIcon'

type RoomType = 'light' | 'shadow'

const COPY: Record<RoomType, { icon: string; title: string; sub: string; visitBg: string }> = {
  light: {
    icon: '🍅',
    title: 'Daisyを訪れてみますか？',
    sub: '同じ実を持つ人たちの声が聞こえます',
    visitBg: '#4A7C59',
  },
  shadow: {
    icon: '🌱',
    title: 'Seedを訪れてみますか？',
    sub: '同じ根を持つ人だけが集まる、静かな場所です',
    visitBg: '#8B6914',
  },
}

const DECLINE_BG   = '#C4B49A'
const DECLINE_TEXT = '#3B2F1E'

export function RoomVisitModal({
  type,
  tagText,
  onVisit,
  onDismiss,
}: {
  type:      RoomType
  tagText:   string
  onVisit:   () => void
  onDismiss: () => void
}) {
  const [visible, setVisible] = useState(false)
  const mounted = useMounted()
  const [garden] = useState(() => loadGardenData())
  const copy = COPY[type]

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  const close = (action: () => void) => {
    setVisible(false)
    setTimeout(action, 250)
  }

  return (
    <div
      onClick={() => close(onDismiss)}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: visible ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
        transition: 'background 0.3s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position:   'relative',
          overflow:   'hidden',
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
        {/* 背景デコレーション（実の部屋＝木 / 根の部屋＝根っこ） */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
          {type === 'light'
            ? <TreeSVG />
            : <RootsSVG rootNodes={garden.roots} mounted={mounted} />}
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.78)' }} />

        <div style={{ position: 'relative' }}>
          <div style={{ margin: '0 0 12px', display: 'flex', justifyContent: 'center' }}>
            {type === 'light' ? <DaisyIcon size={32} stage={4} /> : <span style={{ fontSize: 32 }}>{copy.icon}</span>}
          </div>
          <p style={{ color: '#3B2F1E', fontSize: 16, fontWeight: 700, lineHeight: 1.6, margin: '0 0 6px' }}>
            {copy.title}
          </p>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#A89880', margin: '0 0 16px' }}>
            {tagText}
          </p>
          <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.55)', margin: '0 0 24px', lineHeight: 1.6 }}>
            {copy.sub}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => close(onVisit)}
              style={{
                padding: '14px', borderRadius: 30, border: 'none',
                background: copy.visitBg, color: '#FFFFFF',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >訪れる</button>
            <button
              onClick={() => close(onDismiss)}
              style={{
                padding: '12px', borderRadius: 30, border: 'none',
                background: DECLINE_BG, color: DECLINE_TEXT,
                fontSize: 14, cursor: 'pointer',
              }}
            >訪れない</button>
          </div>
        </div>
      </div>
    </div>
  )
}
