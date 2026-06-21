'use client'

import { useState } from 'react'
import { ACTION_POINTS, type ActionDepth } from '@/src/lib/growthPoint'

interface HelpModalProps {
  onClose: () => void
}

type SectionKey = 'bubble' | 'stage' | 'mechanism' | 'inside'

const POINT_ACTIONS: { icon: string; label: string; key: ActionDepth }[] = [
  { icon: '🚪', label: 'トークを開く',         key: 'room_open' },
  { icon: '💬', label: 'チャットルームに入る', key: 'chat_open' },
  { icon: '✍️', label: '言葉を送る',           key: 'message_sent' },
]

const STAGES = [
  { emoji: '🌱', label: 'タネ', bg: '#D4B896', ptRange: '0〜9pt',   desc: 'まだ種の状態。ルームをのぞいてみよう。' },
  { emoji: '🌿', label: '芽',   bg: '#9DC08B', ptRange: '10〜19pt', desc: '芽が出てきた。仲間と言葉を交わしていこう。' },
  { emoji: '🌼', label: '蕾',   bg: '#F5D78E', ptRange: '20〜29pt', desc: '蕾になった。あとはただ、続けること。' },
  { emoji: '🌸', label: '花',   bg: '#F5A8C0', ptRange: '30pt以上', desc: '満開になった。ありのままで、咲いている。' },
]

const FLOW: { emoji: string; label: string; bg: string }[] = [
  { emoji: '🌱', label: 'タネ', bg: '#D4B896' },
  { emoji: '🌿', label: '芽',   bg: '#9DC08B' },
  { emoji: '🌼', label: '蕾',   bg: '#F5D78E' },
  { emoji: '🌸', label: '花',   bg: '#F5A8C0' },
]

const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: 'bubble',    title: 'バブルってなに？' },
  { key: 'stage',     title: '成長ステージ' },
  { key: 'mechanism', title: '成長の仕組み' },
  { key: 'inside',    title: 'バブルの中には？' },
]

function SectionContent({ sectionKey }: { sectionKey: SectionKey }) {
  if (sectionKey === 'bubble') {
    return (
      <p style={{ fontSize: 14, color: '#3B2F1E', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-line' }}>
        {'バブルはあなたが登録したハッシュタグです。\nルームを訪れるたびに育っていきます。'}
      </p>
    )
  }

  if (sectionKey === 'stage') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {STAGES.map(({ emoji, label, bg, ptRange, desc }) => (
          <div
            key={label}
            style={{
              background: '#FFFFFF', borderRadius: 14,
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
              border: '1px solid rgba(139,105,20,0.1)',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: bg, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>
              {emoji}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#3B2F1E' }}>{label}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: '#8B6914',
                  background: bg, padding: '2px 8px', borderRadius: 99,
                }}>
                  {ptRange}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.7)', margin: 0, lineHeight: 1.5 }}>
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (sectionKey === 'mechanism') {
    return (
      <div>
        <p style={{
          fontSize: 13, fontWeight: 700, color: '#4A7C59',
          textAlign: 'center', margin: '0 0 16px',
        }}>
          合計30ptで満開まで到達
        </p>

        {/* フロー図（横スクロール） */}
        <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            minWidth: 'max-content', padding: '0 4px',
          }}>
            {FLOW.map(({ emoji, label, bg }, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* ステージバッジ */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>
                    {emoji}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#3B2F1E' }}>{label}</span>
                </div>

                {/* 矢印 + pt（最後のステージには表示しない） */}
                {i < FLOW.length - 1 && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#4A7C59' }}>10pt</span>
                    <span style={{ fontSize: 14, color: 'rgba(59,47,30,0.4)', lineHeight: 1 }}>→</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 各段階の内訳 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16 }}>
          {[
            { from: 'タネ', to: '芽', pt: '10pt' },
            { from: '芽',   to: '蕾', pt: '10pt' },
            { from: '蕾',   to: '花', pt: '10pt' },
          ].map(({ from, to, pt }) => (
            <div
              key={from}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FFFFFF', borderRadius: 8, padding: '10px 14px',
                border: '1px solid rgba(139,105,20,0.1)',
              }}
            >
              <span style={{ fontSize: 13, color: '#3B2F1E' }}>
                {from} → {to}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4A7C59' }}>{pt}</span>
            </div>
          ))}
        </div>

        {/* ポイントのつき方 */}
        <p style={{
          fontSize: 13, fontWeight: 700, color: '#3B2F1E',
          margin: '24px 0 10px',
        }}>
          ポイントのつき方
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {POINT_ACTIONS.map(({ icon, label, key }) => (
            <div
              key={key}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FFFFFF', borderRadius: 8, padding: '10px 14px',
                border: '1px solid rgba(139,105,20,0.1)',
              }}
            >
              <span style={{ fontSize: 13, color: '#3B2F1E' }}>{icon} {label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4A7C59' }}>+{ACTION_POINTS[key]}pt</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.55)', lineHeight: 1.7, margin: '10px 0 0' }}>
          1回の訪問につき、最も深く進んだアクションのポイントだけが加算されます。
        </p>
      </div>
    )
  }

  return (
    <p style={{ fontSize: 14, color: '#3B2F1E', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-line' }}>
      {'バブルをタップすると、そのタグに関連した\n訪問履歴・保存した言葉・メモが見られます。'}
    </p>
  )
}

export default function HelpModal({ onClose }: HelpModalProps) {
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set())

  const toggle = (key: SectionKey) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 500, maxWidth: 390, margin: '0 auto',
      background: '#F5F0E8', overflowY: 'auto',
    }}>
      <div style={{ padding: '52px 20px 40px' }}>

        {/* 戻るボタン */}
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, color: '#3B2F1E', padding: 0,
            display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24,
          }}
        >
          ← 戻る
        </button>

        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#3B2F1E', margin: '0 0 20px' }}>
          ヘルプ
        </h1>

        {/* アコーディオン */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SECTIONS.map(({ key, title }) => {
            const isOpen = openSections.has(key)
            return (
              <div
                key={key}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 14,
                  border: '1px solid rgba(139,105,20,0.1)',
                  overflow: 'hidden',
                }}
              >
                {/* ヘッダー行 */}
                <button
                  onClick={() => toggle(key)}
                  style={{
                    width: '100%', padding: '16px 20px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>{title}</span>
                  <span style={{
                    fontSize: 11, color: '#8B6914',
                    display: 'inline-block',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease',
                  }}>
                    ▼
                  </span>
                </button>

                {/* コンテンツ（grid-template-rows でアニメーション） */}
                <div style={{
                  display: 'grid',
                  gridTemplateRows: isOpen ? '1fr' : '0fr',
                  transition: 'grid-template-rows 0.3s ease-out',
                }}>
                  <div style={{ overflow: 'hidden', minHeight: 0 }}>
                    <div style={{ padding: '0 20px 20px' }}>
                      <SectionContent sectionKey={key} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
