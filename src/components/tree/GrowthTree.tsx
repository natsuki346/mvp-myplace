'use client'

import type { GrowthStage } from './useGrowthStage'

const TRUNK_COLOR = '#8B6914'
const STEM_COLOR = '#4A7C59'
const LEAF_COLORS = ['#4A7C59', '#5A9C6A']

// 地面ライン・土壌エリア
const GROUND_LINE_Y = 360
const GRASS_HEIGHT = 8
const SOIL_HEIGHT = 5
const SOIL_TOP = GROUND_LINE_Y + GRASS_HEIGHT + SOIL_HEIGHT
const SEED_Y = SOIL_TOP + 5 // タネ：土の境目から少し下

// 開花時のデイジー（ウェルカム画面と同じイラスト・花びらを大きく表現）
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

// 閉じたつぼみ（開花前）を指定座標に配置する
function ClosedBud({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="0" rx={size * 0.32} ry={size * 0.46} fill="#5A9C6A" />
      <ellipse cx="0" cy={-size * 0.12} rx={size * 0.2} ry={size * 0.28} fill="#FFF176" />
    </g>
  )
}

// きらきら（芽吹きの瞬間を祝う・地上エリアに散らす）
const SPARKLES = [
  { x: 60,  y: 80,  size: 9,  delay: 0 },
  { x: 252, y: 64,  size: 12, delay: 0.5 },
  { x: 96,  y: 190, size: 7,  delay: 1.0 },
  { x: 232, y: 226, size: 11, delay: 0.3 },
  { x: 48,  y: 270, size: 8,  delay: 1.4 },
  { x: 268, y: 310, size: 10, delay: 0.8 },
  { x: 162, y: 56,  size: 12, delay: 1.7 },
]

function Sparkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const d = `M0,${-size} L${size * 0.25},${-size * 0.25} L${size},0 L${size * 0.25},${size * 0.25} L0,${size} L${-size * 0.25},${size * 0.25} L${-size},0 L${-size * 0.25},${-size * 0.25} Z`
  return (
    <g transform={`translate(${x},${y})`}>
      <path d={d} fill="#FFE17A" className="gt-sparkle" style={{ animationDelay: `${delay}s` }} />
    </g>
  )
}

type GrowthMessage = { title: string; subtitle?: string; titleSize?: number; subtitleSize?: number }

export default function GrowthTree({ stage, size = 320, message }: { stage: GrowthStage; size?: number; message?: GrowthMessage }) {
  const showBloom = stage === 'bloom'

  return (
    <div key={stage} style={{ width: size, aspectRatio: '320 / 420', position: 'relative', animation: 'gt-tree-fade-in 0.8s ease both' }}>
      <style>{`
        @keyframes gt-tree-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gt-tree-pop { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes gt-tree-bloom { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes gt-tree-grow { from { transform: scale(0.92); } to { transform: scale(1); } }
        @keyframes gt-root-grow { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes gt-sparkle { 0%, 100% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes gt-dim { 0% { opacity: 0; } 15% { opacity: 0.45; } 80% { opacity: 0.45; } 100% { opacity: 0; } }
        @keyframes gt-dim-message-title {
          0%, 8%  { opacity: 0; transform: scale(0.92); color: #FFF6E5; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
          18%     { opacity: 1; transform: scale(1); color: #FFF6E5; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
          85%, 100% { opacity: 1; transform: scale(1); color: #3B2F1E; text-shadow: 0 0 0 rgba(0,0,0,0); }
        }
        @keyframes gt-dim-message-sub {
          0%, 8%  { opacity: 0; transform: scale(0.92); color: #FFE8B8; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
          18%     { opacity: 1; transform: scale(1); color: #FFE8B8; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
          85%, 100% { opacity: 1; transform: scale(1); color: #8B6914; text-shadow: 0 0 0 rgba(0,0,0,0); }
        }
        @keyframes gt-clap { 0%, 100% { opacity: 0; transform: scale(0.6) rotate(-10deg); } 50% { opacity: 1; transform: scale(1.15) rotate(10deg); } }
        @keyframes gt-seed-fade { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.6); } }
        .gt-seed-fade { transform-box: fill-box; transform-origin: center; animation: gt-seed-fade 0.5s ease-in forwards; animation-delay: 0.2s; }
        .gt-pop  { transform-box: fill-box; transform-origin: center; animation: gt-tree-pop 0.8s ease both; }
        .gt-sparkle { transform-box: fill-box; transform-origin: center; animation: gt-sparkle 1.5s ease-in-out 3 forwards; }
        .gt-dim { animation: gt-dim 4.5s ease-in-out forwards; pointer-events: none; }
        .gt-dim-message-title { animation: gt-dim-message-title 4.5s ease-in-out forwards; }
        .gt-dim-message-sub { animation: gt-dim-message-sub 4.5s ease-in-out forwards; }
        .gt-clap { position: absolute; transform-box: fill-box; transform-origin: center; animation: gt-clap 1.5s ease-in-out 3 forwards; }
        .gt-bloom-group { transform-box: fill-box; transform-origin: center; animation: gt-tree-bloom 1s ease both; }
        .gt-whole-bloom { transform-box: fill-box; transform-origin: 50% 90%; animation: gt-tree-grow 1.2s ease both; }
        .gt-root { stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 0.85; animation: gt-root-grow 0.7s ease-out forwards; }
      `}</style>
      <svg width="100%" height="100%" viewBox="0 0 320 420" className={showBloom ? 'gt-whole-bloom' : undefined}>
        {/* 地面（草ライン＋土ライン＋土壌） */}
        <rect x="0" y={GROUND_LINE_Y} width="320" height={GRASS_HEIGHT} fill="#4A7C59" />
        <rect x="0" y={GROUND_LINE_Y + GRASS_HEIGHT} width="320" height={SOIL_HEIGHT} fill="#8B6914" />
        <rect x="0" y={SOIL_TOP} width="320" height={420 - SOIL_TOP} fill="#C9A96E" />

        {/* 幹（タネのみ：地面から少しだけ顔を出す茶色い芽） */}
        {stage === 'seed' && (
          <line
            x1="160" y1={GROUND_LINE_Y}
            x2="160" y2={GROUND_LINE_Y - 12}
            stroke={TRUNK_COLOR} strokeWidth="6" strokeLinecap="round"
          />
        )}

        {/* タネ */}
        {stage === 'seed' && (
          <>
            <ellipse cx="160" cy={GROUND_LINE_Y} rx="16" ry="12" fill="#D4B896" />
            <ellipse cx="156" cy={GROUND_LINE_Y - 3} rx="7" ry="5" fill="#C4A07A" />
          </>
        )}

        {/* 成長の節目を祝う演出：一時的な暗転＋きらきら（次段階の要素は暗転の上に描かれて目立つ） */}
        {(stage === 'sprout' || stage === 'bud' || stage === 'budding') && (
          <>
            <rect x="0" y="0" width="320" height="420" fill="#2A1F14" className="gt-dim" />
            {SPARKLES.map((sp, i) => (
              <Sparkle key={i} {...sp} />
            ))}
          </>
        )}

        {/* タネ＋根：土の中に根を張りながら芽吹く */}
        {stage === 'sprout' && (
          <>
            {/* 根（伸びるアニメーション） */}
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

            {/* タネ（根元に残る） */}
            <g className="gt-pop">
              <ellipse cx="160" cy={SEED_Y} rx="16" ry="12" fill="#D4B896" />
              <ellipse cx="156" cy={SEED_Y - 3} rx="7" ry="5" fill="#C4A07A" />
            </g>
          </>
        )}

        {/* つぼみ（アニメーション2）：アニメーション1のタネが育って、小さな芽が一本出る */}
        {stage === 'bud' && (
          <>
            {/* 根：芽が出ると同時に消える */}
            <g className="gt-seed-fade">
              <path d="M160 378 Q158 400 160 417" fill="none" stroke="#8B6914" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
              <path d="M159 378 Q140 402 122 419" fill="none" stroke="#8B6914" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
              <path d="M161 378 Q180 402 198 419" fill="none" stroke="#8B6914" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
              <path d="M140 402 Q128 411 116 419" fill="none" stroke="#A0791A" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
              <path d="M180 402 Q192 411 204 419" fill="none" stroke="#A0791A" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
            </g>

            {/* タネ：芽が出ると同時に消える */}
            <g className="gt-seed-fade">
              <ellipse cx="160" cy={SEED_Y} rx="16" ry="12" fill="#D4B896" />
              <ellipse cx="156" cy={SEED_Y - 3} rx="7" ry="5" fill="#C4A07A" />
            </g>

            {/* タネから茎が伸び、葉が開く（成長アニメーション） */}
            <path d="M160 360 L160 322" stroke={STEM_COLOR} strokeWidth="4" strokeLinecap="round"
              pathLength={1} className="gt-root" style={{ animationDelay: '0.2s' }} />
            <g className="gt-pop" style={{ animationDelay: '0.7s' }}>
              <ellipse cx="148" cy="324" rx="14" ry="8" fill={LEAF_COLORS[1]} transform="rotate(-25 148 324)" />
              <ellipse cx="172" cy="320" rx="14" ry="8" fill={LEAF_COLORS[0]} transform="rotate(20 172 320)" />
            </g>
          </>
        )}

        {/* つぼみ（アニメーション3）：アニメーション2の芽が育って、枝葉とつぼみが育つ */}
        {stage === 'budding' && (
          <>
            {/* アニメーション2の小さな葉：枝葉が育つと同時に消える */}
            <g className="gt-seed-fade">
              <ellipse cx="148" cy="324" rx="14" ry="8" fill={LEAF_COLORS[1]} transform="rotate(-25 148 324)" />
              <ellipse cx="172" cy="320" rx="14" ry="8" fill={LEAF_COLORS[0]} transform="rotate(20 172 320)" />
            </g>

            {/* 茎（アニメーション2から続く根元） */}
            <line x1="160" y1={GROUND_LINE_Y} x2="160" y2="322" stroke={STEM_COLOR} strokeWidth="4" strokeLinecap="round" />

            {/* 茎が伸びる（成長アニメーション） */}
            <path d="M160 322 L160 238" stroke={STEM_COLOR} strokeWidth="4" strokeLinecap="round"
              pathLength={1} className="gt-root" style={{ animationDelay: '0.2s' }} />

            {/* 地面と地下の狭間から上向きに生える葉（Y字に開く） */}
            <g className="gt-pop" style={{ animationDelay: '0.6s' }}>
              <ellipse cx="140" cy="342" rx="20" ry="7" fill={LEAF_COLORS[0]} transform="rotate(58 140 342)" />
              <ellipse cx="180" cy="342" rx="20" ry="7" fill={LEAF_COLORS[1]} transform="rotate(-58 180 342)" />
            </g>

            {/* 閉じたつぼみ：開花はまだ（茎の先に1本だけ） */}
            <g className="gt-pop" style={{ animationDelay: '1.1s' }}>
              <ClosedBud x={160} y={230} size={28} />
            </g>
          </>
        )}

        {/* 開花：茎（ウェルカム画面と同じ・わずかにカーブ／高さを抑える） */}
        {showBloom && (
          <path d="M160 360 Q166 286 160 210" fill="none" stroke="#5A8A40" strokeWidth="6" strokeLinecap="round" />
        )}

        {/* 開花：地面スレスレに広がる葉（ウェルカム画面と同じ・放射状6枚） */}
        {showBloom && (
          <g className="gt-pop">
            {/* 左右水平に広がる葉 */}
            <ellipse cx="128" cy="359" rx="28" ry="9" fill="#3D7048" transform="rotate(-4 128 359)" />
            <ellipse cx="192" cy="359" rx="28" ry="9" fill="#3D7048" transform="rotate(4 192 359)" />
            {/* 斜め下に垂れる葉 */}
            <ellipse cx="142" cy="369" rx="20" ry="7" fill="#4A7C59" transform="rotate(-38 142 369)" />
            <ellipse cx="178" cy="369" rx="20" ry="7" fill="#4A7C59" transform="rotate(38 178 369)" />
            {/* 斜め上に立ち上がる葉 */}
            <ellipse cx="140" cy="342" rx="18" ry="6" fill="#4A7C59" transform="rotate(-58 140 342)" />
            <ellipse cx="180" cy="342" rx="18" ry="6" fill="#4A7C59" transform="rotate(58 180 342)" />
          </g>
        )}

        {/* 開花：茎の中ほどの葉（ウェルカム画面と同じ・先細り形状） */}
        {showBloom && (
          <g className="gt-pop">
            <path d="M160 284 C128 274 105 286 98 302 C122 310 150 298 160 284 Z" fill="#4A7C59" />
            <path d="M160 280 C192 270 215 282 222 298 C198 306 170 294 160 280 Z" fill="#4A7C59" />
          </g>
        )}

        {/* 開花：デイジー（ウェルカム画面と同じイラストで花びらを大きく・1本だけ） */}
        {showBloom && (
          <g className="gt-bloom-group">
            <g transform="translate(160 210)">
              {/* 外側花びら13枚 */}
              {PETAL_ANGLES.map((angle, i) => (
                <path key={`outer-${angle}`}
                  d="M0,0 C-8,-15 -6,-55 0,-72 C6,-55 8,-15 0,0Z"
                  fill={i % 2 === 0 ? '#F5D060' : '#F0C840'}
                  transform={`rotate(${angle})`} />
              ))}
              {/* 内側花びら13枚（外側の間に半分オフセット配置） */}
              {PETAL_ANGLES.map(angle => (
                <path key={`inner-${angle}`}
                  d="M0,0 C-5,-10 -4,-36 0,-46 C4,-36 5,-10 0,0Z"
                  fill="#EFC030"
                  transform={`rotate(${angle + PETAL_ANGLE_STEP / 2})`} />
              ))}
              {/* 花の中心（ドーム状） */}
              <circle cx="0" cy="0" r="22" fill="#C47A10" />
              <circle cx="0" cy="0" r="18" fill="#D98C18" />
              <circle cx="0" cy="0" r="13" fill="#E8A020" />
              {/* つぶつぶ */}
              {CENTER_DOTS.map(({ cx, cy }, i) => (
                <circle key={i} cx={cx} cy={cy} r="2.2" fill="#C47A10" opacity="0.6" />
              ))}
            </g>
          </g>
        )}
      </svg>

      {/* 暗転中に大きく表示するメッセージ */}
      {(stage === 'sprout' || stage === 'bud' || stage === 'budding') && message && (
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', padding: '0 24px',
            transform: 'translateY(-100px)',
          }}
        >
          {/* 拍手 */}
          <span className="gt-clap" style={{ left: '9%', top: '32%', fontSize: 26, animationDelay: '0.2s' }}>👏</span>
          <span className="gt-clap" style={{ right: '9%', top: '32%', fontSize: 26, animationDelay: '0.5s' }}>👏</span>
          <span className="gt-clap" style={{ left: '17%', top: '60%', fontSize: 22, animationDelay: '0.8s' }}>👏</span>
          <span className="gt-clap" style={{ right: '17%', top: '60%', fontSize: 22, animationDelay: '1.1s' }}>👏</span>

          <p className="gt-dim-message-title" style={{ fontSize: message.titleSize ?? 21, fontWeight: 800, margin: 0, lineHeight: 1.5 }}>
            {message.title}
          </p>
          {message.subtitle && (
            <p className="gt-dim-message-sub" style={{ fontSize: message.subtitleSize ?? 21, fontWeight: 600, margin: '12px 0 0', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {message.subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
