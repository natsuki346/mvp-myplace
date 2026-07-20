'use client'

// ── オンボーディング③：タグ可視化（ガーデン）画面 ─────────────────────────────
// Q1（乗り越えた経験＝light）と Q2（今の悩み＝shadow）で選んだタグを可視化する。
// 花などの装飾は出さず、light は緑系、shadow は青系のカードで並べるだけ。
// タグは Q2 直後に sessionStorage へ引き継がれる。リロード等で失われた場合は
// tags テーブル（is_active=true）から読み直す（tags は anon で SELECT 可）。
// 「次へ」で HELP/Rescue 説明画面（/onboarding/about）へ。

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'

// 表示用に先頭の # を1つに正規化する（DB由来は#なし、選択由来は#付きが混在するため）
function withHash(text: string): string {
  const t = text.replace(/^#+/, '').trim()
  return t ? `#${t}` : ''
}

function readStashed(key: string): string[] {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export default function VisualizePage() {
  const router = useRouter()
  const [light, setLight] = useState<string[]>([])
  const [shadow, setShadow] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      // まず sessionStorage（Q2から引き継いだ選択タグ）
      const stashedLight = readStashed('onboarding_light_tags')
      const stashedShadow = readStashed('onboarding_shadow_tags')
      if (stashedLight.length > 0 || stashedShadow.length > 0) {
        if (!cancelled) {
          setLight(stashedLight.map(withHash).filter(Boolean))
          setShadow(stashedShadow.map(withHash).filter(Boolean))
          setLoading(false)
        }
        return
      }

      // フォールバック：DB から現在有効なタグを読み直す
      const userId = localStorage.getItem('user_id')
      if (!userId) { if (!cancelled) setLoading(false); return }
      try {
        const { data } = await supabase
          .from('tags')
          .select('text, type')
          .eq('user_id', userId)
          .eq('is_active', true) as { data: { text: string; type: string }[] | null }
        if (!cancelled && data) {
          setLight(data.filter(r => r.type === 'light').map(r => withHash(r.text)).filter(Boolean))
          setShadow(data.filter(r => r.type === 'shadow').map(r => withHash(r.text)).filter(Boolean))
        }
      } catch { /* 読めなくても画面は出す */ }
      if (!cancelled) setLoading(false)
    }

    void load()
    return () => { cancelled = true }
  }, [])

  // フェードイン
  useEffect(() => {
    if (loading) return
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [loading])

  const goNext = () => router.replace('/onboarding/about')

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
          あなたの経験と悩みが<br />可視化されました
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.55)', margin: '0 0 28px', textAlign: 'center' }}>
          ここから、同じ経験・悩みを持つ人とつながります
        </p>

        {/* 乗り越えた経験（light / 緑系） */}
        <TagGroup
          label="乗り越えた経験"
          emoji="🌱"
          tags={light}
          empty="（選択なし）"
          badgeBg="#E4EFE0"
          badgeBorder="#4A7C59"
          badgeColor="#2F6D3B"
          dotColor="#4A7C59"
        />

        <div style={{ height: 20 }} />

        {/* 今抱えている悩み（shadow / 青系） */}
        <TagGroup
          label="今抱えている悩み"
          emoji="🌊"
          tags={shadow}
          empty="（選択なし）"
          badgeBg="#E1ECF5"
          badgeBorder="#3E6E9E"
          badgeColor="#2A5480"
          dotColor="#3E6E9E"
        />

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

function TagGroup({
  label, emoji, tags, empty, badgeBg, badgeBorder, badgeColor, dotColor,
}: {
  label: string
  emoji: string
  tags: string[]
  empty: string
  badgeBg: string
  badgeBorder: string
  badgeColor: string
  dotColor: string
}) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 16, padding: '16px 16px 18px',
      border: '1px solid rgba(139,115,85,0.15)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>{emoji}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E' }}>{label}</span>
      </div>
      {tags.length === 0 ? (
        <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.4)', margin: 0 }}>{empty}</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {tags.map(t => (
            <span
              key={t}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 999, fontSize: 14, fontWeight: 600,
                background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeColor,
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0,
              }} />
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
