'use client'

export default function TutorialOverlay() {
  return (
    <div
      className="fixed inset-0 flex justify-center"
      style={{ zIndex: 150, pointerEvents: 'none' }}
    >
      <div className="relative w-full" style={{ maxWidth: 390 }}>
        {/* ルームナビのハイライト */}
        <div
          className="absolute rounded-2xl"
          style={{
            left: '50%', bottom: 6, transform: 'translateX(-50%)',
            width: 84, height: 56,
            border: '2px solid #4A7C59',
            background: 'rgba(74,124,89,0.08)',
          }}
        />

        {/* 吹き出し + 矢印 */}
        <div
          className="absolute flex flex-col items-center"
          style={{ left: '50%', bottom: 76, transform: 'translateX(-50%)' }}
        >
          <div
            className="rounded-xl px-3 py-2"
            style={{
              background: '#fff',
              border: '1.5px solid #4A7C59',
              color: '#3B2F1E',
              fontSize: 12,
              whiteSpace: 'nowrap',
            }}
          >
            ルームへ移動してみよう
          </div>
          <span
            className="animate-bounce"
            style={{ fontSize: 22, color: '#4A7C59', marginTop: 2, lineHeight: 1 }}
          >
            ↓
          </span>
        </div>
      </div>
    </div>
  )
}
