'use client'

type GrowthWelcomeMessageProps = {
  onNext: () => void
}

export default function GrowthWelcomeMessage({ onNext }: GrowthWelcomeMessageProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        maxWidth: 390, margin: '0 auto',
        background: 'rgba(59,47,30,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
      }}
    >
      <div style={{
        width: '100%',
        background: '#F5F0E8',
        borderRadius: 20,
        padding: 24,
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#3B2F1E', margin: '0 0 24px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          <span style={{ color: '#E0708A' }}>DaiMeは己を愛でる場所です。</span>
          {'\nさあ、あなた自身の旅を始めましょう！'}
        </p>
        <button
          onClick={onNext}
          style={{
            width: '100%', padding: '14px', borderRadius: 24, border: 'none',
            background: '#4A7C59', color: '#FFFFFF',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          始める
        </button>
      </div>
    </div>
  )
}
