'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/src/lib/supabase/client'
import { SEED_QUOTES, SEED_PRAISE, type SeedQuote } from '@/src/constants/quotes'

interface SeedQuoteModalProps {
  tagId: string
  onClose: () => void
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function SeedQuoteModal({ tagId, onClose }: SeedQuoteModalProps) {
  const [visible, setVisible]             = useState(false)
  const [savedContents, setSavedContents] = useState<Set<string>>(new Set())
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const praise = useMemo(() => pickOne(SEED_PRAISE), [])
  const quote  = useMemo(() => pickOne(SEED_QUOTES), [])
  const content = `${quote.text} ― ${quote.author}`

  // 保存済みコンテンツを取得
  useEffect(() => {
    const userId = sessionStorage.getItem('user_id')
    if (!userId) { setVisible(true); return }
    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('saved_messages') as any)
        .select('content')
        .eq('user_id', userId)
        .eq('tag_id', tagId)
        .in('content', [content])

      if (data) {
        setSavedContents(new Set((data as { content: string }[]).map(d => d.content)))
      }
      setVisible(true)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagId])

  const handleToggleSave = useCallback(async (q: SeedQuote) => {
    const userId = sessionStorage.getItem('user_id')
    if (!userId) return

    const c = `${q.text} ― ${q.author}`
    const isSaved = savedContents.has(c)

    setSavedContents(prev => {
      const next = new Set(prev)
      if (isSaved) next.delete(c)
      else next.add(c)
      return next
    })

    if (isSaved) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('saved_messages') as any)
        .delete()
        .eq('user_id', userId)
        .eq('tag_id', tagId)
        .eq('content', c)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('saved_messages') as any)
        .insert([{ user_id: userId, message_id: null, tag_id: tagId, content: c }])
    }
  }, [savedContents, tagId])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const isSaved = savedContents.has(content)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        maxWidth: 390,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        background: visible ? 'rgba(59,47,30,0.4)' : 'rgba(59,47,30,0)',
        transition: 'background 0.3s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          background: '#F5F0E8',
          borderRadius: 20,
          padding: '28px 24px 24px',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          textAlign: 'center',
        }}
      >
        {/* 褒め言葉 */}
        <p style={{
          fontSize: 16,
          fontWeight: 500,
          color: '#4A7C59',
          margin: '0 0 20px',
          lineHeight: 1.5,
        }}>
          {praise}
        </p>

        {/* 名言本文 */}
        <p style={{
          fontSize: 22,
          fontWeight: 500,
          color: '#3B2F1E',
          lineHeight: 1.6,
          margin: 0,
          padding: '24px 0',
          whiteSpace: 'pre-wrap',
          wordBreak: 'keep-all',
        }}>
          {quote.text}
        </p>

        {/* 著者名 */}
        <p style={{
          fontSize: 14,
          color: '#8B6914',
          margin: '0 0 20px',
        }}>
          ― {quote.author}
        </p>

        {/* 🔖 保存ボタン */}
        <button
          onClick={() => handleToggleSave(quote)}
          aria-label={isSaved ? '保存を解除' : '保存する'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isSaved ? 1 : 0.4,
            transition: 'opacity 0.15s ease',
            marginBottom: 4,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={isSaved ? '#4A7C59' : 'none'}
            stroke={isSaved ? '#4A7C59' : '#3B2F1E'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {/* つづけるボタン */}
        <button
          onClick={close}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            border: 'none',
            background: '#4A7C59',
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            marginTop: 24,
            display: 'block',
          }}
        >
          つづける
        </button>
      </div>
    </div>
  )
}
