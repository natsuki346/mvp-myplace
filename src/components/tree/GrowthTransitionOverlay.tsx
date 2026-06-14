'use client'

import GrowthTree from './GrowthTree'
import type { GrowthStage } from './useGrowthStage'

type GrowthMessage = { title: string; subtitle?: string; titleSize?: number; subtitleSize?: number }
type GrowthQuote = { text: string; author?: string }

type GrowthTransitionOverlayProps = {
  stage: GrowthStage
  message?: GrowthMessage
  quote?: GrowthQuote
  buttonText?: string
  onNext: () => void
}

export default function GrowthTransitionOverlay({
  stage, message, quote, buttonText = '次に進む', onNext,
}: GrowthTransitionOverlayProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        maxWidth: 390, margin: '0 auto',
        background: 'rgba(245,240,232,0.95)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
      }}
    >
      <style>{`
        @keyframes gt-copy-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .gt-copy { animation: gt-copy-in 0.6s ease both; animation-delay: ${message ? '4.5s' : '1.2s'}; }
        .gt-quote { animation: gt-copy-in 0.6s ease both; animation-delay: 0.3s; }
      `}</style>

      {quote && (
        <div className="gt-quote" style={{ position: 'absolute', top: 90, left: 0, right: 0, textAlign: 'center', padding: '0 32px' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#3B2F1E', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
            {quote.text}
          </p>
          {quote.author && (
            <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.55)', margin: '6px 0 0' }}>
              — {quote.author}
            </p>
          )}
        </div>
      )}

      <GrowthTree stage={stage} message={message} />

      <div className="gt-copy" style={{ width: '100%', maxWidth: 280, textAlign: 'center', marginTop: 8 }}>
        <button
          onClick={onNext}
          style={{
            width: '100%', padding: '14px', marginTop: 24,
            borderRadius: 24, border: 'none',
            background: '#4A7C59', color: '#FFFFFF',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}
