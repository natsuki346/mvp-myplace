'use client'

export default function RoomNavArrow() {
  return (
    <div
      className="fixed inset-0 flex justify-center"
      style={{ zIndex: 150, pointerEvents: 'none' }}
    >
      <div className="relative w-full" style={{ maxWidth: 390 }}>
        {/* ルームナビのハイライト */}
        <div
          className="absolute rounded-2xl animate-pulse"
          style={{
            left: '50%', bottom: 6, transform: 'translateX(-50%)',
            width: 84, height: 56,
            border: '2.5px solid #E53935',
            background: 'rgba(229,57,53,0.08)',
          }}
        />

        {/* 吹き出し + 矢印 */}
        <div
          className="absolute flex flex-col items-center"
          style={{ left: '50%', bottom: 76, transform: 'translateX(-50%)' }}
        >
          <div className="flex flex-col items-center animate-bounce">
            <div
              className="rounded-xl px-3 py-2"
              style={{
                background: '#fff',
                border: '1.5px solid #E53935',
                color: '#E53935',
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              ルームへ移動してみよう
            </div>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginTop: 2 }}>
              <path
                d="M24 6 L24 38 M12 26 L24 42 L36 26"
                stroke="#E53935"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
