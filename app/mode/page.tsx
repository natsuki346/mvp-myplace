'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Mode = 'user' | 'host'

const OPTIONS: { key: Mode; emoji: string; title: string; sub: string }[] = [
  { key: 'user', emoji: '🤝', title: '話を聞いてほしい', sub: 'HELPやSOSを出して来てもらう' },
  { key: 'host', emoji: '💬', title: '話を聞いてあげたい', sub: 'ホストとして稼働して依頼を受ける' },
]

export default function ModePage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode | null>(null)
  const [skipToday, setSkipToday] = useState(false)

  const start = () => {
    if (!mode) return
    localStorage.setItem('selectedMode', mode)
    // 「今日はこれ以降表示しない」→ 今日の日付を保存
    if (skipToday) localStorage.setItem('skipModeSelect', new Date().toDateString())
    else localStorage.removeItem('skipModeSelect')
    router.replace('/home/feed')
  }

  return (
    // PC時はPCNav(56px)の分だけ高さを縮め、ボタンまでスクロールなしで収める
    <div className="md:h-[calc(100svh-56px)]! md:py-6!" style={{
      background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
      height: '100svh', display: 'flex', flexDirection: 'column',
      padding: 'calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom))',
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={{ fontSize: 20, fontWeight: 700, color: '#3B2F1E', textAlign: 'center', margin: '0 0 28px' }}>
          今日はどちらで使いますか？
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {OPTIONS.map(o => {
            const on = mode === o.key
            return (
              <button
                key={o.key}
                onClick={() => setMode(o.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16, width: '100%',
                  background: on ? '#FBEFC6' : '#FFFFFF',
                  border: on ? '2px solid #C9A84C' : '1px solid rgba(139,115,85,0.2)',
                  borderRadius: 16, padding: '20px 18px', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{o.emoji}</span>
                <span>
                  <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: '#3B2F1E' }}>{o.title}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'rgba(59,47,30,0.5)', marginTop: 3 }}>{o.sub}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 今日はこれ以降表示しない */}
      <button
        onClick={() => setSkipToday(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'center',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '8px 0', marginBottom: 12, flexShrink: 0,
        }}
      >
        <span style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          border: skipToday ? 'none' : '1.5px solid #B0A48A',
          background: skipToday ? '#4A7C59' : '#FFFFFF',
          color: '#FFFFFF', fontSize: 13, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {skipToday ? '✓' : ''}
        </span>
        <span style={{ fontSize: 13, color: '#3B2F1E' }}>今日はこれ以降表示しない</span>
      </button>

      <button
        onClick={start}
        disabled={!mode}
        style={{
          width: '100%', padding: '15px 0', borderRadius: 24, border: 'none',
          background: mode ? '#4A7C59' : 'rgba(74,124,89,0.4)',
          color: '#F5F0E8', fontSize: 15, fontWeight: 700,
          cursor: mode ? 'pointer' : 'default', flexShrink: 0,
        }}
      >
        このモードではじめる
      </button>
    </div>
  )
}
