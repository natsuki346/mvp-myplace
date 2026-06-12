'use client'

type GrowthModalProps = {
  onStart: () => void
}

export default function GrowthModal({ onStart }: GrowthModalProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-6"
      style={{ zIndex: 290, background: 'rgba(0,0,0,0.45)' }}
    >
      <div
        className="animate-popIn w-full rounded-3xl px-6 py-8 text-center"
        style={{ maxWidth: 320, background: '#FFFFFF' }}
      >
        <div style={{ position: 'relative', height: 120, marginBottom: 16 }}>
          <svg width="160" height="120" viewBox="0 0 160 140" style={{ display: 'block', margin: '0 auto' }}>
            {/* 土 */}
            <ellipse cx="80" cy="120" rx="50" ry="14" fill="#C4A882" />
            {/* 種 */}
            <ellipse cx="80" cy="118" rx="8" ry="6" fill="#6B4E0F" />
            {/* 芽 */}
            <g className="animate-sprout" style={{ transformOrigin: 'center bottom', transformBox: 'fill-box' }}>
              <line x1="80" y1="118" x2="80" y2="50" stroke="#4A7C59" strokeWidth="4" strokeLinecap="round" />
              <path d="M80 60 Q55 45 50 60 Q65 70 80 65 Z" fill="#5A9468" />
              <path d="M80 55 Q105 40 112 56 Q98 68 80 62 Z" fill="#4A7C59" />
            </g>
          </svg>
          <span className="animate-sparkle" style={{ position: 'absolute', top: 4, left: '28%', fontSize: 18, color: '#BA7517' }}>✨</span>
          <span className="animate-sparkle [animation-delay:0.6s]" style={{ position: 'absolute', top: 28, right: '24%', fontSize: 14, color: '#BA7517' }}>✨</span>
        </div>

        <span
          className="inline-block rounded-full px-3 py-1 text-xs font-bold mb-3"
          style={{ background: '#EAF3DE', color: '#4A7C59' }}
        >
          💧 growth point +2
        </span>

        <h2 className="mb-2" style={{ color: '#3B2F1E', fontSize: 20, fontWeight: 600 }}>向き合えてえらい！</h2>
        <p className="text-sm mb-0" style={{ color: 'rgba(59,47,30,0.7)', lineHeight: 1.7 }}>
          根の部屋は、<br />
          向き合うたびに水が撒かれ、<br />
          今は根でも徐々に実に育ちます。
        </p>

        {/* ポイント構成の説明 */}
        <div style={{ background: '#F5F0E8', borderRadius: 12, padding: 12, marginTop: 12, marginBottom: 24, textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#3B2F1E', lineHeight: 2 }}>🚪 ルームを開く　　+1pt</p>
          <p style={{ margin: 0, fontSize: 12, color: '#3B2F1E', lineHeight: 2 }}>💬 チャットを開く　+2pt</p>
          <p style={{ margin: 0, fontSize: 12, color: '#3B2F1E', lineHeight: 2 }}>✉️ メッセージを送る +3pt</p>
          <p style={{ margin: 0, fontSize: 12, color: '#3B2F1E', lineHeight: 2 }}>※訪問ごとにカウント・その中での最深行動のみ</p>
        </div>

        <button
          onClick={onStart}
          className="w-full py-3 rounded-full text-sm font-bold"
          style={{ background: '#8B6914', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
        >
          理解した
        </button>
      </div>
    </div>
  )
}
