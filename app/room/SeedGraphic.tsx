'use client'

type SeedGraphicProps = {
  // 成長ステージ（0〜6）：根の深さ・本数に反映
  stage: number
  // true の間は未成長状態（dashoffset=1）で描画し、false に戻ると0.5sかけて描画される
  animate: boolean
}

const ROOT_COLOR = '#8B6F4E'

// 主根の長さ（ステージ0〜6）
const MAIN_ROOT_LENGTH = [0, 12, 20, 28, 36, 36, 36]

export default function SeedGraphic({ stage, animate }: SeedGraphicProps) {
  const drawn = !animate
  const dashStyle = {
    strokeDasharray: 1,
    strokeDashoffset: drawn ? 0 : 1,
    transition: 'stroke-dashoffset 0.5s ease',
  }
  const fadeStyle = {
    opacity: drawn ? 1 : 0,
    transition: 'opacity 0.5s ease',
  }
  const mainLen = MAIN_ROOT_LENGTH[Math.min(Math.max(stage, 0), 6)]

  return (
    <svg width="60" height="100" viewBox="-30 -50 60 100" style={{ overflow: 'visible', display: 'block' }}>
      {/* タネ本体：土に埋まっても分かるよう、土より濃い色＋輪郭で表現 */}
      <ellipse cx="0" cy="0" rx="18" ry="14" fill="#A47148" stroke="#6B4226" strokeWidth="1.5" />
      <ellipse cx="-4" cy="-3" rx="8" ry="6" fill="#F5E1B8" />

      {/* 主根（ステージ1以上） */}
      {stage >= 1 && (
        <line x1="0" y1="13" x2="0" y2={13 + mainLen} stroke={ROOT_COLOR} strokeWidth="2.5" strokeLinecap="round" pathLength={1} style={dashStyle} />
      )}

      {/* 枝根：1段目（ステージ2以上） */}
      {stage >= 2 && (
        <>
          <path d="M0 18 Q-10 24 -14 34" stroke={ROOT_COLOR} strokeWidth="2" fill="none" strokeLinecap="round" pathLength={1} style={dashStyle} />
          <path d="M0 18 Q10 24 14 34" stroke={ROOT_COLOR} strokeWidth="2" fill="none" strokeLinecap="round" pathLength={1} style={dashStyle} />
        </>
      )}

      {/* 枝根：2段目（ステージ4以上） */}
      {stage >= 4 && (
        <>
          <path d="M0 26 Q-16 34 -22 46" stroke={ROOT_COLOR} strokeWidth="1.5" fill="none" strokeLinecap="round" pathLength={1} style={dashStyle} />
          <path d="M0 26 Q16 34 22 46" stroke={ROOT_COLOR} strokeWidth="1.5" fill="none" strokeLinecap="round" pathLength={1} style={dashStyle} />
        </>
      )}

      {/* 細い根毛（ステージ6） */}
      {stage >= 6 && (
        <g style={fadeStyle}>
          <line x1="-2" y1="20" x2="-7" y2="22" stroke={ROOT_COLOR} strokeWidth="1" strokeLinecap="round" />
          <line x1="2" y1="20" x2="7" y2="22" stroke={ROOT_COLOR} strokeWidth="1" strokeLinecap="round" />
          <line x1="-3" y1="32" x2="-9" y2="35" stroke={ROOT_COLOR} strokeWidth="1" strokeLinecap="round" />
          <line x1="3" y1="32" x2="9" y2="35" stroke={ROOT_COLOR} strokeWidth="1" strokeLinecap="round" />
        </g>
      )}
    </svg>
  )
}
