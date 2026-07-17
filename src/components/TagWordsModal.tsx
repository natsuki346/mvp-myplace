'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase/client'

const JOURNALS_EDGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/journals`
const EDGE_AUTH_HEADERS = {
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
}

const DEFAULT_ACCENT = '#8B6914'
const SLIDE_MS = 280

type Item = { id: string; content: string; created_at: string }
type TabType = 'saved' | 'journal'

type Props = {
  tagId: string
  tagText: string
  // tagsテーブルのcolorフィールド。null時はアプリ標準の茶色をアクセントに使う
  tagColor: string | null
  onClose: () => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export default function TagWordsModal({ tagId, tagText, tagColor, onClose }: Props) {
  const accent = tagColor ?? DEFAULT_ACCENT
  const clean = tagText.replace(/^#+/, '')

  const [visible, setVisible] = useState(false)
  const [tab, setTab] = useState<TabType>('saved')
  const [savedMessages, setSavedMessages] = useState<Item[]>([])
  const [journals, setJournals] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  // マウント直後にスライドイン開始
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, SLIDE_MS)
  }

  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    if (!userId) { setLoading(false); return }
    ;(async () => {
      const [savedRes, journalsRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('saved_messages') as any)
          .select('id, content, created_at')
          .eq('tag_id', tagId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        // tag_id一致 または 本文にタグ名を含む日記（Edge Function側で新しい順ソート済み）
        fetch(
          `${JOURNALS_EDGE_URL}?tag_id=${encodeURIComponent(tagId)}&q=${encodeURIComponent(clean)}`,
          { headers: { ...EDGE_AUTH_HEADERS, 'x-user-id': userId } },
        ).then(r => r.ok ? r.json() : []),
      ])
      setSavedMessages((savedRes.data as Item[]) ?? [])
      setJournals((journalsRes as Item[]) ?? [])
      setLoading(false)
    })()
  }, [tagId, clean])

  const items = tab === 'saved' ? savedMessages : journals

  return (
    <>
      {/* オーバーレイ */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(59,47,30,0.45)',
          opacity: visible ? 1 : 0,
          transition: `opacity ${SLIDE_MS}ms ease`,
        }}
      />

      {/* シート（下からスライドイン） */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', zIndex: 401,
        width: '100%', maxWidth: 390,
        height: '92svh', maxHeight: '92svh',
        background: '#F5F0E8',
        borderRadius: '20px 20px 0 0',
        borderTop: `3px solid ${accent}`,
        transform: visible ? 'translate(-50%, 0)' : 'translate(-50%, 100%)',
        transition: `transform ${SLIDE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {/* ドラッグハンドル */}
        <div style={{ width: 36, height: 4, background: 'rgba(139,105,20,.25)', borderRadius: 2, margin: '12px auto 0', flexShrink: 0 }} />

        {/* ヘッダー：タグ名＋閉じる */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px 12px', flexShrink: 0,
        }}>
          <span style={{
            background: accent, color: '#FFFFFF',
            padding: '5px 14px', borderRadius: 20,
            fontSize: 14, fontWeight: 700,
            maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            #{clean}
          </span>
          <button
            onClick={handleClose}
            aria-label="閉じる"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, color: 'rgba(59,47,30,0.4)', lineHeight: 1, padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* タブ：保存した言葉 / 日記 */}
        <div style={{ display: 'flex', padding: '0 20px', gap: 8, marginBottom: 12, flexShrink: 0 }}>
          {([
            { key: 'saved' as TabType, label: `💬 保存した言葉（${savedMessages.length}）` },
            { key: 'journal' as TabType, label: `📓 日記（${journals.length}）` },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 12,
                border: 'none', cursor: 'pointer',
                background: tab === key ? accent : 'rgba(59,47,30,0.07)',
                color: tab === key ? '#FFFFFF' : 'rgba(59,47,30,0.45)',
                fontSize: 12, fontWeight: tab === key ? 700 : 500,
                transition: 'background 0.2s ease, color 0.2s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* リスト */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', paddingTop: 32, fontSize: 13, color: 'rgba(59,47,30,0.4)' }}>
              読み込み中...
            </p>
          ) : items.length === 0 ? (
            <p style={{ textAlign: 'center', paddingTop: 32, fontSize: 13, color: 'rgba(59,47,30,0.4)' }}>
              まだ言葉がありません
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(item => (
                <div key={item.id} style={{
                  background: '#FFFFFF', borderRadius: 12,
                  borderLeft: `3px solid ${accent}`,
                  padding: '12px 14px',
                }}>
                  <p style={{
                    fontSize: 13, color: '#3B2F1E', margin: 0,
                    lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {item.content}
                  </p>
                  <p style={{ fontSize: 10, color: 'rgba(59,47,30,0.4)', margin: '8px 0 0', textAlign: 'right' }}>
                    {formatDate(item.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
