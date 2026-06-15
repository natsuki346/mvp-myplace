'use client'

type ThankYouModalProps = {
  onClose: () => void
}

export default function ThankYouModal({ onClose }: ThankYouModalProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-6"
      style={{ zIndex: 290, background: 'rgba(0,0,0,0.45)' }}
    >
      <div
        className="animate-popIn w-full rounded-3xl px-6 py-8 text-center"
        style={{ maxWidth: 320, background: '#FFFFFF' }}
      >
        <p style={{ fontSize: 48, margin: '0 0 16px' }}>🌱</p>

        <h2 className="mb-2" style={{ color: '#3B2F1E', fontSize: 20, fontWeight: 600 }}>協力ありがとう</h2>
        <p className="text-sm mb-6" style={{ color: 'rgba(59,47,30,0.7)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
          {'あなたの言葉が、同じ土で育つ人の\n根っこになっていきます。'}
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 text-sm font-bold"
          style={{ background: '#4A7C59', color: '#FFFFFF', border: 'none', borderRadius: 24, cursor: 'pointer' }}
        >
          ガーデンへ戻る
        </button>
      </div>
    </div>
  )
}
