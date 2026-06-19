'use client'

import { useEffect, useState } from 'react'
import GrowthTree from './GrowthTree'
import type { GrowthStage } from './useGrowthStage'

type GrowthMessage = { title: string; subtitle?: string; titleSize?: number; subtitleSize?: number }
type GrowthQuote = { text: string; author?: string; fontSize?: number }

type GrowthTransitionOverlayProps = {
  stage: GrowthStage
  message?: GrowthMessage
  quote?: GrowthQuote
  buttonText?: string
  onNext: () => void
}

// phase: 0=tree only, 1=circle, 2=check, 3=text1, 4=text2, 5=quote popup
const PHASE_TIMINGS = [1200, 2000, 2600, 3000, 3800]

export default function GrowthTransitionOverlay({
  stage, message, quote, buttonText = '次に進む', onNext,
}: GrowthTransitionOverlayProps) {
  const [phase, setPhase] = useState(0)
  const [popupClosed, setPopupClosed] = useState(false)

  useEffect(() => {
    const timers = PHASE_TIMINGS.map((ms, i) =>
      setTimeout(() => setPhase(i + 1), ms)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        maxWidth: 390, margin: '0 auto',
        background: '#F5F0E8',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '40px 32px',
      }}
    >
      <style>{`
        @keyframes gt-circle-draw {
          from { stroke-dashoffset: 264; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes gt-check-draw {
          from { stroke-dashoffset: 70; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes gt-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gt-popup-bg {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes gt-popup-card {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ⑤⑥ テキスト（ツリーの上・スペース確保してopacityで制御） */}
      <div style={{ width: '100%', textAlign: 'center', marginBottom: 12, minHeight: 54 }}>
        <p
          style={{
            fontSize: message?.titleSize ?? 17,
            fontWeight: 700,
            color: '#3B2F1E',
            margin: '0 0 6px',
            lineHeight: 1.55,
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
        >
          {message?.title}
        </p>
        <p
          style={{
            fontSize: message?.subtitleSize ?? 13,
            fontWeight: 700,
            color: '#3B2F1E',
            margin: 0,
            lineHeight: 1.6,
            opacity: phase >= 4 ? 1 : 0,
            transform: phase >= 4 ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
        >
          {message?.subtitle}
        </p>
      </div>

      {/* ① ② タネ→芽アニメーション */}
      <GrowthTree stage={stage} size={200} />

      {/* ③ 緑の円 ＋ ④ チェックマーク */}
      {phase >= 1 && (
        <div style={{ marginTop: 20 }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="#4A7C59"
              strokeWidth="2.5"
              strokeDasharray="264"
              strokeLinecap="round"
              style={{
                strokeDashoffset: 0,
                animation: 'gt-circle-draw 800ms cubic-bezier(0.4, 0, 0.2, 1) both',
              }}
            />
            {phase >= 2 && (
              <polyline
                points="28,52 44,68 72,34"
                fill="none"
                stroke="#4A7C59"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="70"
                style={{
                  strokeDashoffset: 0,
                  animation: 'gt-check-draw 500ms cubic-bezier(0.4, 0, 0.2, 1) both',
                }}
              />
            )}
          </svg>
        </div>
      )}

      {/* ⑦ 名言ポップアップ（閉じるまで表示） */}
      {phase >= 5 && !popupClosed && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 24px',
            background: 'rgba(59,47,30,0.4)',
            animation: 'gt-popup-bg 0.4s ease both',
          }}
        >
          <div
            style={{
              width: '100%', maxWidth: 342,
              background: '#F5F0E8',
              borderRadius: 20,
              padding: '28px 24px',
              textAlign: 'center',
              animation: 'gt-popup-card 0.4s ease both',
            }}
          >
            {quote && (
              <>
                <p
                  style={{
                    fontSize: quote.fontSize ?? 18, fontWeight: 700, color: '#3B2F1E',
                    lineHeight: 1.75, margin: 0, whiteSpace: 'pre-line',
                  }}
                >
                  {quote.text}
                </p>
                {quote.author && (
                  <p style={{ fontSize: 12, color: '#8B6914', margin: '10px 0 0' }}>
                    — {quote.author}
                  </p>
                )}
              </>
            )}
            <button
              onClick={() => setPopupClosed(true)}
              style={{
                marginTop: 20,
                padding: '10px 32px',
                borderRadius: 9999,
                border: 'none',
                background: '#3B2F1E',
                color: '#F5F0E8',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* ⑧ ポップアップを閉じた後：次へボタン */}
      {popupClosed && (
        <button
          onClick={onNext}
          style={{
            marginTop: 32,
            width: '100%', maxWidth: 280,
            padding: '14px',
            borderRadius: 24, border: 'none',
            background: '#4A7C59', color: '#FFFFFF',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            animation: 'gt-fade-up 0.5s ease both',
          }}
        >
          {buttonText}
        </button>
      )}
    </div>
  )
}
