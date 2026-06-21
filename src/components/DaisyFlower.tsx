'use client'

const PETAL_ANGLES = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324]

// 起動時のスプラッシュ等で使う、丸い背景（バブル）なしの花びらだけのシンプルなデイジー。
// animateがtrueになると、中心の芽から花びらが1枚ずつ外側へ咲いていく
export default function DaisyFlower({ size, animate }: { size: number; animate: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }}>
      <style>{`
        @keyframes daisy-bloom-petal {
          0%   { transform: scale(0); opacity: 0; }
          65%  { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes daisy-bloom-center {
          0%   { transform: scale(0); opacity: 0; }
          70%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      {PETAL_ANGLES.map((angle, i) => (
        <g key={angle} transform={`rotate(${angle} 50 50)`}>
          <ellipse
            cx="50" cy="35" rx="6" ry="15"
            fill="#FFE44D"
            style={{
              transformOrigin: '50px 50px',
              opacity: animate ? undefined : 0,
              animation: animate
                ? `daisy-bloom-petal 0.5s ${0.4 + i * 0.05}s cubic-bezier(0.34,1.56,0.64,1) both`
                : undefined,
            }}
          />
        </g>
      ))}
      <circle
        cx="50" cy="50" r="12" fill="#E8A020"
        style={{
          transformOrigin: '50px 50px',
          opacity: animate ? undefined : 0,
          animation: animate ? 'daisy-bloom-center 0.45s cubic-bezier(0.34,1.56,0.64,1) both' : undefined,
        }}
      />
      <circle
        cx="50" cy="50" r="7" fill="#C47A10"
        style={{
          transformOrigin: '50px 50px',
          opacity: animate ? undefined : 0,
          animation: animate ? 'daisy-bloom-center 0.45s cubic-bezier(0.34,1.56,0.64,1) both' : undefined,
        }}
      />
    </svg>
  )
}
