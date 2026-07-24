'use client'

// リアクション用の絵文字ボトムシート（ルーム／プライベートチャット共通）。
// クイック絵文字 → カテゴリタブ → 絵文字グリッド。絵文字を選ぶと onPick(emoji)、
// 背景タップで onClose。RoomChat のピッカーと同じ見た目・操作。

import { useRef, useState } from 'react'
import { QUICK_EMOJIS, EMOJI_CATS } from '@/src/lib/emoji'

export default function EmojiReactionSheet({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void
  onClose: () => void
}) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [activeCatIndex, setActiveCatIndex] = useState(0)

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(59,47,30,0.35)', zIndex: 10 }}
      />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: '#F5F0E8', borderRadius: '20px 20px 0 0',
        borderTop: '1px solid #D4B896', zIndex: 11,
      }}>
        <div style={{ width: 36, height: 4, background: 'rgba(139,105,20,.25)', borderRadius: 2, margin: '10px auto 0' }} />
        <div style={{ fontSize: 13, color: '#8B6914', textAlign: 'center', padding: '8px 0 4px', fontWeight: 500 }}>
          リアクションを選ぶ
        </div>
        {/* クイック5つ */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '8px 16px 12px', borderBottom: '.5px solid rgba(139,105,20,.15)' }}>
          {QUICK_EMOJIS.map(emoji => (
            <button key={emoji}
              onClick={() => onPick(emoji)}
              style={{ fontSize: 28, background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8 }}
            >{emoji}</button>
          ))}
        </div>
        {/* カテゴリタブ */}
        <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '.5px solid rgba(139,105,20,.15)', padding: '4px 8px 0' }}>
          {EMOJI_CATS.map((cat, i) => (
            <button key={i}
              onClick={() => {
                setActiveCatIndex(i)
                document.getElementById(`react-cat-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              style={{
                fontSize: 20, padding: '6px 10px', cursor: 'pointer', flexShrink: 0,
                background: 'none', border: 'none',
                borderBottom: activeCatIndex === i ? '2px solid #8B6914' : '2px solid transparent',
              }}
            >{cat.icon}</button>
          ))}
        </div>
        {/* 絵文字グリッド */}
        <div
          ref={gridRef}
          style={{ height: 220, overflowY: 'auto', padding: '4px 12px 32px' }}
          onScroll={() => {
            EMOJI_CATS.forEach((_, i) => {
              const el = document.getElementById(`react-cat-${i}`)
              if (el && gridRef.current) {
                const rect = el.getBoundingClientRect()
                const parentRect = gridRef.current.getBoundingClientRect()
                if (rect.top <= parentRect.top + 40) setActiveCatIndex(i)
              }
            })
          }}
        >
          {EMOJI_CATS.map((cat, catIdx) => (
            <div key={catIdx} id={`react-cat-${catIdx}`}>
              <div style={{ fontSize: 11, color: '#8B6914', fontWeight: 500, padding: '8px 0 4px' }}>{cat.label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2 }}>
                {cat.emojis.map(emoji => (
                  <button key={emoji}
                    onClick={() => onPick(emoji)}
                    style={{ fontSize: 22, textAlign: 'center', padding: '4px 0', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer' }}
                  >{emoji}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
