'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Mode = 'user' | 'host'
type MethodKey = 'call' | 'meet' | 'both'

const OPTIONS: { key: Mode; emoji: string; title: string; sub: string }[] = [
  { key: 'user', emoji: '🤝', title: '話を聞いてほしい', sub: 'Talk to meやCome onで来てもらう' },
  { key: 'host', emoji: '💬', title: '話を聞いてあげたい', sub: 'ワーカーとして稼働して依頼を受ける' },
]

// ワーカーの対応手段（users.available_methods に保存）
const METHOD_OPTIONS: { key: MethodKey; icon: string; label: string }[] = [
  { key: 'call', icon: '📞', label: 'Talk to me（通話）' },
  { key: 'meet', icon: '🤝', label: 'Come on（対面で会う）' },
  { key: 'both', icon: '✨', label: '両方OK' },
]

const EDGE_FUNCTIONS_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const EDGE_FUNCTION_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
}

export default function ModePage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode | null>(null)
  const [method, setMethod] = useState<MethodKey | null>(null)
  const [skipToday, setSkipToday] = useState(false)
  const [saving, setSaving] = useState(false)

  const canStart = mode === 'user' || (mode === 'host' && method !== null)

  const start = async () => {
    if (!canStart || saving) return
    localStorage.setItem('selectedMode', mode!)
    // 「今日はこれ以降表示しない」→ 今日の日付を保存
    if (skipToday) localStorage.setItem('skipModeSelect', new Date().toDateString())
    else localStorage.removeItem('skipModeSelect')

    // ワーカー：対応手段を保存し、オンラインにする（失敗してもフローは止めない）
    const uid = localStorage.getItem('user_id')
    if (mode === 'host' && method && uid) {
      setSaving(true)
      try {
        await fetch(`${EDGE_FUNCTIONS_BASE}/set-availability`, {
          method: 'POST',
          headers: EDGE_FUNCTION_HEADERS,
          body: JSON.stringify({ user_id: uid, methods: [method], is_online: true }),
        })
      } catch { /* best-effort */ }
      setSaving(false)
    }
    router.replace('/home/feed')
  }

  return (
    // 全コンテンツをスクロールなしで画面中央に収める。
    // body の padding-top:env(safe-area-inset-top) を差し引いてビューポートちょうどに収め、
    // 下端（始めるボタン）が画面外にはみ出さないようにする。
    // PC時は PCNav(56px) 分だけ縮める。
    <div className="md:h-[calc(100svh-56px)]!" style={{
      background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
      height: 'calc(100svh - env(safe-area-inset-top))', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '16px 20px calc(16px + env(safe-area-inset-bottom))',
      gap: 12,
    }}>
      <p style={{ fontSize: 18, fontWeight: 700, color: '#3B2F1E', textAlign: 'center', margin: 0 }}>
        今日はどちらで使いますか？
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {OPTIONS.map(o => {
          const on = mode === o.key
          return (
            <button
              key={o.key}
              onClick={() => setMode(o.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                background: on ? '#FBEFC6' : '#FFFFFF',
                border: on ? '2px solid #C9A84C' : '1px solid rgba(139,115,85,0.2)',
                borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{o.emoji}</span>
              <span>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>{o.title}</span>
                <span style={{ display: 'block', fontSize: 12, color: 'rgba(59,47,30,0.5)', marginTop: 2 }}>{o.sub}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* ── ワーカー選択時：対応手段（available_methods） ── */}
      {mode === 'host' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E', textAlign: 'center', margin: '4px 0 0' }}>
            今日はどの手段で対応できますか？
          </p>
          {METHOD_OPTIONS.map(m => {
            const on = method === m.key
            return (
              <button
                key={m.key}
                onClick={() => setMethod(m.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  background: on ? '#E4EFE0' : '#FFFFFF',
                  border: on ? '2px solid #4A7C59' : '1px solid rgba(139,115,85,0.2)',
                  borderRadius: 12, padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{m.icon}</span>
                <span style={{ fontSize: 14, fontWeight: on ? 700 : 500, color: '#3B2F1E' }}>{m.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* 今日はこれ以降表示しない */}
      <button
        onClick={() => setSkipToday(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'center',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px 0',
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
        disabled={!canStart || saving}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 24, border: 'none',
          background: canStart && !saving ? '#4A7C59' : 'rgba(74,124,89,0.4)',
          color: '#F5F0E8', fontSize: 15, fontWeight: 700,
          cursor: canStart && !saving ? 'pointer' : 'default',
        }}
      >
        {saving ? '設定を保存中...' : 'このモードではじめる'}
      </button>
    </div>
  )
}
