'use client'

import type { GrowthStage } from './useGrowthStage'

const STEM_COLOR = '#4A7C59'
const LEAF_COLORS = ['#4A7C59', '#5A9C6A']

const GROUND_LINE_Y = 360
const GRASS_HEIGHT = 8
const SOIL_HEIGHT = 5
const SOIL_TOP = GROUND_LINE_Y + GRASS_HEIGHT + SOIL_HEIGHT
const SEED_Y = SOIL_TOP + 5

const PETAL_COUNT = 13
const PETAL_ANGLE_STEP = 360 / PETAL_COUNT
const PETAL_ANGLES = Array.from({ length: PETAL_COUNT }, (_, i) => i * PETAL_ANGLE_STEP)
const CENTER_DOTS = [
  { cx: 7, cy: 0 },
  { cx: 3.5, cy: 6.062 },
  { cx: -3.5, cy: 6.062 },
  { cx: -7, cy: 0 },
  { cx: -3.5, cy: -6.062 },
  { cx: 3.5, cy: -6.062 },
]

function ClosedBud({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="0" rx={size * 0.32} ry={size * 0.46} fill="#5A9C6A" />
      <ellipse cx="0" cy={-size * 0.12} rx={size * 0.2} ry={size * 0.28} fill="#FFF176" />
    </g>
  )
}

export default function GrowthTree({ stage, size = 320 }: { stage: GrowthStage; size?: number }) {
  const showBloom = stage === 'bloom'

  return (
    <div key={stage} style={{ width: size, aspectRatio: '320 / 420', position: 'relative', animation: 'gt-tree-fade-in 0.8s ease both' }}>
      <style>{`
        @keyframes gt-tree-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gt-tree-pop { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes gt-tree-bloom { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes gt-tree-grow { from { transform: scale(0.92); } to { transform: scale(1); } }
        @keyframes gt-root-grow { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes gt-seed-fade { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.6); } }
        .gt-seed-fade { transform-box: fill-box; transform-origin: center; animation: gt-seed-fade 0.5s ease-in forwards; animation-delay: 0.2s; }
        .gt-pop  { transform-box: fill-box; transform-origin: center; animation: gt-tree-pop 0.8s ease both; }
        .gt-bloom-group { transform-box: fill-box; transform-origin: center; animation: gt-tree-bloom 1s ease both; }
        .gt-whole-bloom { transform-box: fill-box; transform-origin: 50% 90%; animation: gt-tree-grow 1.2s ease both; }
        .gt-root { stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 0.85; animation: gt-root-grow 0.7s ease-out forwards; }
      `}</style>
      <svg width="100%" height="100%" viewBox="0 0 320 420" className={showBloom ? 'gt-whole-bloom' : undefined}>
        {/* 地面 */}
        <rect x="0" y={GROUND_LINE_Y} width="320" height={GRASS_HEIGHT} fill="#4A7C59" />
        <rect x="0" y={GROUND_LINE_Y + GRASS_HEIGHT} width="320" height={SOIL_HEIGHT} fill="#8B6914" />
        <rect x="0" y={SOIL_TOP} width="320" height={420 - SOIL_TOP} fill="#C9A96E" />

        {/* タネ（seed） */}
        {stage === 'seed' && (
          <>
            <line x1="160" y1={GROUND_LINE_Y} x2="160" y2={GROUND_LINE_Y - 12}
              stroke="#8B6914" strokeWidth="6" strokeLinecap="round" />
            <ellipse cx="160" cy={GROUND_LINE_Y} rx="16" ry="12" fill="#D4B896" />
            <ellipse cx="156" cy={GROUND_LINE_Y - 3} rx="7" ry="5" fill="#C4A07A" />
          </>
        )}

        {/* 芽吹き（sprout）：根が伸びて、地上に茎と葉が出る */}
        {stage === 'sprout' && (
          <>
            {/* 根（地下） */}
            <path d="M160 378 Q158 400 160 417" fill="none" stroke="#8B6914" strokeWidth="4" strokeLinecap="round"
              pathLength={1} className="gt-root" style={{ animationDelay: '0s' }} />
            <path d="M159 378 Q140 402 122 419" fill="none" stroke="#8B6914" strokeWidth="3" strokeLinecap="round"
              pathLength={1} className="gt-root" style={{ animationDelay: '0.1s' }} />
            <path d="M161 378 Q180 402 198 419" fill="none" stroke="#8B6914" strokeWidth="3" strokeLinecap="round"
              pathLength={1} className="gt-root" style={{ animationDelay: '0.1s' }} />
            <path d="M140 402 Q128 411 116 419" fill="none" stroke="#A0791A" strokeWidth="1.5" strokeLinecap="round"
              pathLength={1} className="gt-root" style={{ animationDelay: '0.25s' }} />
            <path d="M180 402 Q192 411 204 419" fill="none" stroke="#A0791A" strokeWidth="1.5" strokeLinecap="round"
              pathLength={1} className="gt-root" style={{ animationDelay: '0.25s' }} />
            {/* タネ */}
            <g className="gt-pop">
              <ellipse cx="160" cy={SEED_Y} rx="16" ry="12" fill="#D4B896" />
              <ellipse cx="156" cy={SEED_Y - 3} rx="7" ry="5" fill="#C4A07A" />
            </g>
            {/* 茎（地上へ伸びる） */}
            <path d="M160 360 L160 308" fill="none" stroke={STEM_COLOR} strokeWidth="3.5" strokeLinecap="round"
              pathLength={1} className="gt-root" style={{ animationDelay: '0.55s' }} />
            {/* 小さな葉 */}
            <g className="gt-pop" style={{ animationDelay: '1.1s' }}>
              <ellipse cx="147" cy="316" rx="13" ry="6" fill={LEAF_COLORS[1]} transform="rotate(-30 147 316)" />
              <ellipse cx="173" cy="312" rx="13" ry="6" fill={LEAF_COLORS[0]} transform="rotate(25 173 312)" />
            </g>
          </>
        )}

        {/* つぼみ（bud）：小さな芽 */}
        {stage === 'bud' && (
          <>
            <g className="gt-seed-fade">
              <path d="M160 378 Q158 400 160 417" fill="none" stroke="#8B6914" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
              <path d="M159 378 Q140 402 122 419" fill="none" stroke="#8B6914" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
              <path d="M161 378 Q180 402 198 419" fill="none" stroke="#8B6914" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
              <path d="M140 402 Q128 411 116 419" fill="none" stroke="#A0791A" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
              <path d="M180 402 Q192 411 204 419" fill="none" stroke="#A0791A" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
            </g>
            <g className="gt-seed-fade">
              <ellipse cx="160" cy={SEED_Y} rx="16" ry="12" fill="#D4B896" />
              <ellipse cx="156" cy={SEED_Y - 3} rx="7" ry="5" fill="#C4A07A" />
            </g>
            <path d="M160 360 L160 322" stroke={STEM_COLOR} strokeWidth="4" strokeLinecap="round"
              pathLength={1} className="gt-root" style={{ animationDelay: '0.2s' }} />
            <g className="gt-pop" style={{ animationDelay: '0.7s' }}>
              <ellipse cx="148" cy="324" rx="14" ry="8" fill={LEAF_COLORS[1]} transform="rotate(-25 148 324)" />
              <ellipse cx="172" cy="320" rx="14" ry="8" fill={LEAF_COLORS[0]} transform="rotate(20 172 320)" />
            </g>
          </>
        )}

        {/* 枝葉とつぼみ（budding） */}
        {stage === 'budding' && (
          <>
            <g className="gt-seed-fade">
              <ellipse cx="148" cy="324" rx="14" ry="8" fill={LEAF_COLORS[1]} transform="rotate(-25 148 324)" />
              <ellipse cx="172" cy="320" rx="14" ry="8" fill={LEAF_COLORS[0]} transform="rotate(20 172 320)" />
            </g>
            <line x1="160" y1={GROUND_LINE_Y} x2="160" y2="322" stroke={STEM_COLOR} strokeWidth="4" strokeLinecap="round" />
            <path d="M160 322 L160 238" stroke={STEM_COLOR} strokeWidth="4" strokeLinecap="round"
              pathLength={1} className="gt-root" style={{ animationDelay: '0.2s' }} />
            <g className="gt-pop" style={{ animationDelay: '0.6s' }}>
              <ellipse cx="140" cy="342" rx="20" ry="7" fill={LEAF_COLORS[0]} transform="rotate(58 140 342)" />
              <ellipse cx="180" cy="342" rx="20" ry="7" fill={LEAF_COLORS[1]} transform="rotate(-58 180 342)" />
            </g>
            <g className="gt-pop" style={{ animationDelay: '1.1s' }}>
              <ClosedBud x={160} y={230} size={28} />
            </g>
          </>
        )}

        {/* 開花（bloom）：デイジー */}
        {showBloom && (
          <>
            <path d="M160 360 Q166 286 160 210" fill="none" stroke="#5A8A40" strokeWidth="6" strokeLinecap="round" />
            <g className="gt-pop">
              <ellipse cx="128" cy="359" rx="28" ry="9" fill="#3D7048" transform="rotate(-4 128 359)" />
              <ellipse cx="192" cy="359" rx="28" ry="9" fill="#3D7048" transform="rotate(4 192 359)" />
              <ellipse cx="142" cy="369" rx="20" ry="7" fill="#4A7C59" transform="rotate(-38 142 369)" />
              <ellipse cx="178" cy="369" rx="20" ry="7" fill="#4A7C59" transform="rotate(38 178 369)" />
              <ellipse cx="140" cy="342" rx="18" ry="6" fill="#4A7C59" transform="rotate(-58 140 342)" />
              <ellipse cx="180" cy="342" rx="18" ry="6" fill="#4A7C59" transform="rotate(58 180 342)" />
            </g>
            <g className="gt-pop">
              <path d="M160 284 C128 274 105 286 98 302 C122 310 150 298 160 284 Z" fill="#4A7C59" />
              <path d="M160 280 C192 270 215 282 222 298 C198 306 170 294 160 280 Z" fill="#4A7C59" />
            </g>
            <g className="gt-bloom-group">
              <g transform="translate(160 210)">
                {PETAL_ANGLES.map((angle, i) => (
                  <path key={`outer-${angle}`}
                    d="M0,0 C-8,-15 -6,-55 0,-72 C6,-55 8,-15 0,0Z"
                    fill={i % 2 === 0 ? '#F5D060' : '#F0C840'}
                    transform={`rotate(${angle})`} />
                ))}
                {PETAL_ANGLES.map(angle => (
                  <path key={`inner-${angle}`}
                    d="M0,0 C-5,-10 -4,-36 0,-46 C4,-36 5,-10 0,0Z"
                    fill="#EFC030"
                    transform={`rotate(${angle + PETAL_ANGLE_STEP / 2})`} />
                ))}
                <circle cx="0" cy="0" r="22" fill="#C47A10" />
                <circle cx="0" cy="0" r="18" fill="#D98C18" />
                <circle cx="0" cy="0" r="13" fill="#E8A020" />
                {CENTER_DOTS.map(({ cx, cy }, i) => (
                  <circle key={i} cx={cx} cy={cy} r="2.2" fill="#C47A10" opacity="0.6" />
                ))}
              </g>
            </g>
          </>
        )}
      </svg>
    </div>
  )
}
