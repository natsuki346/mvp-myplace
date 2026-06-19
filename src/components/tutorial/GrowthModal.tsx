'use client'

import { useEffect, useState } from 'react'
import GrowthTree from '@/src/components/tree/GrowthTree'
import Fireworks from '@/src/components/tree/Fireworks'
import { useGrowthStage } from '@/src/components/tree/useGrowthStage'

type GrowthModalProps = {
  onComplete?: () => void
}

type Phase = 'blooming' | 'quote'

const QUOTE_TEXT = 'あなた自身を愛しなさい。\n宇宙のどこを探しても、\nあなたほどあなたの愛に\n値する人はいない。'
const QUOTE_AUTHOR = 'ブッダ'

export default function GrowthModal({ onComplete }: GrowthModalProps) {
  const { setGrowthStage } = useGrowthStage()
  const [showFireworks, setShowFireworks] = useState(true)
  const [phase, setPhase] = useState<Phase>('blooming')

  useEffect(() => {
    setGrowthStage('bloom')
    const fireworksTimer = window.setTimeout(() => setShowFireworks(false), 4500)
    // 花が咲くアニメーション（GrowthTreeのbloom演出、約1.2秒）が終わったタイミングで名言を出す
    const quoteTimer = window.setTimeout(() => setPhase('quote'), 1400)
    return () => { window.clearTimeout(fireworksTimer); window.clearTimeout(quoteTimer) }
  }, [setGrowthStage])

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ zIndex: 290, maxWidth: 390, margin: '0 auto', background: '#F5F0E8' }}
    >
      <style>{`
        @keyframes gm-quote-pop-in {
          from { opacity: 0; transform: translateY(16px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .gm-quote-popup { animation: gm-quote-pop-in 0.35s ease both; }
      `}</style>

      {showFireworks && <Fireworks />}

      <GrowthTree stage="bloom" />

      {/* ── 名言ポップアップ（Seedルーム訪問後の名言表示と同じ仕組み・見た目） ──
          「つづける」を押すとこのモーダル自体を閉じてガーデン画面に戻し、
          続きのメッセージはガーデン側（garden-display.tsx）で表示する。 */}
      {phase === 'quote' && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 320,
            maxWidth: 390, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 24px',
            background: 'rgba(59,47,30,0.4)',
          }}
        >
          <div className="gm-quote-popup" style={{
            width: '100%',
            background: '#F5F0E8',
            borderRadius: 20,
            padding: '28px 24px 24px',
            textAlign: 'center',
          }}>
            <p style={{
              fontSize: 20, fontWeight: 700, color: '#3B2F1E',
              lineHeight: 1.6, margin: 0, padding: '8px 0 24px',
              whiteSpace: 'pre-line',
            }}>
              {QUOTE_TEXT}
            </p>
            <p style={{ fontSize: 14, color: '#8B6914', margin: '0 0 20px' }}>
              ― {QUOTE_AUTHOR}
            </p>
            <button
              onClick={() => onComplete?.()}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: '#4A7C59', color: '#FFFFFF',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >
              つづける
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
