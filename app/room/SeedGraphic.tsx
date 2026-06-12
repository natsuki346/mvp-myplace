'use client'

type SeedGraphicProps = {
  // 成長ステージ（0〜6、6=収穫）
  stage: number
  // true の間は未成長状態（dashoffset=1）で描画し、false に戻ると0.5sかけて描画される
  animate: boolean
}

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

  return (
    <svg width="60" height="120" viewBox="-15 -70 75 175" style={{ overflow: 'visible', display: 'block' }}>
      {/* 追加の葉（ステージ5） */}
      {stage >= 5 && (
        <g style={fadeStyle}>
          <ellipse cx="14" cy="-40" rx="10" ry="5.5" fill="#5A9468" transform="rotate(-30 14 -40)" />
          <ellipse cx="36" cy="-40" rx="10" ry="5.5" fill="#5A9468" transform="rotate(30 36 -40)" />
        </g>
      )}

      {/* 葉（ステージ4） */}
      {stage >= 4 && (
        <g style={fadeStyle}>
          <ellipse cx="12" cy="-26" rx="11" ry="6" fill="#4A7C59" transform="rotate(-35 12 -26)" />
          <ellipse cx="38" cy="-26" rx="11" ry="6" fill="#4A7C59" transform="rotate(35 38 -26)" />
        </g>
      )}

      {/* 茎（ステージ3以上） */}
      {stage >= 3 && (
        <line x1="25" y1="0" x2="25" y2="-44" stroke="#4A7C59" strokeWidth="3" strokeLinecap="round" pathLength={1} style={dashStyle} />
      )}

      {/* タネ本体 */}
      <ellipse cx="25" cy="10" rx="14" ry="19" fill="#6B3A0F" transform="rotate(-15 25 10)" />
      <ellipse cx="19" cy="2" rx="4" ry="3" fill="#9C6A2E" opacity="0.6" />

      {/* 主根（ステージ1以上） */}
      {stage >= 1 && (
        <line x1="25" y1="28" x2="25" y2="55" stroke="#7A4515" strokeWidth="2.5" strokeLinecap="round" pathLength={1} style={dashStyle} />
      )}

      {/* 枝根（ステージ2以上） */}
      {stage >= 2 && (
        <>
          <path d="M25 40 Q12 50 8 65" stroke="#8B5020" strokeWidth="2" fill="none" strokeLinecap="round" pathLength={1} style={dashStyle} />
          <path d="M25 40 Q38 50 42 65" stroke="#8B5020" strokeWidth="2" fill="none" strokeLinecap="round" pathLength={1} style={dashStyle} />
        </>
      )}

      {/* 根の広がり（ステージ3以上） */}
      {stage >= 3 && (
        <>
          <path d="M25 45 Q3 62 -2 82" stroke="#8B5020" strokeWidth="1.5" fill="none" strokeLinecap="round" pathLength={1} style={dashStyle} />
          <path d="M25 45 Q47 62 52 82" stroke="#8B5020" strokeWidth="1.5" fill="none" strokeLinecap="round" pathLength={1} style={dashStyle} />
        </>
      )}

      {/* 深く広がる根（ステージ4以上） */}
      {stage >= 4 && (
        <>
          <path d="M25 55 Q-2 78 -8 102" stroke="#8B5020" strokeWidth="1.5" fill="none" strokeLinecap="round" pathLength={1} style={dashStyle} />
          <path d="M25 55 Q52 78 58 102" stroke="#8B5020" strokeWidth="1.5" fill="none" strokeLinecap="round" pathLength={1} style={dashStyle} />
        </>
      )}

      {/* 収穫（ステージ6）：実を一番手前・大きめに描く */}
      {stage >= 6 && (
        <g style={fadeStyle}>
          <circle cx="25" cy="-46" r="13" fill="#E0533D" />
          <circle cx="20" cy="-50" r="4" fill="#fff" opacity="0.35" />
          <path d="M25 -58 Q19 -63 25 -66 Q31 -63 25 -58 Z" fill="#4A7C59" />
        </g>
      )}
    </svg>
  )
}
