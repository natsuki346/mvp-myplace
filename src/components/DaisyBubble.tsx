'use client'

export interface DaisyBubbleProps {
  size: number
  // true の場合、花を円の中央（y=50）に配置する。
  // ガーデンではハッシュタグを下半分に重ねるため花を上寄せ（y=28）にするが、
  // テキストを重ねないチャット画面などでは中央に置いた方が自然。
  centered?: boolean
}

const PETAL_ANGLES = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324]

// 葉・茎は描かず、花を縮小。cy に花の中心を置く（デフォルト28=上寄せ / 50=中央）。
function BloomSVG({ cy = 28 }: { cy?: number }) {
  return (
    <>
      <circle cx="50" cy="50" r="50" fill="#F5D78E" />
      <g transform={`translate(50 ${cy}) scale(0.7) translate(-50 -48)`}>
        {/* 花びら 10枚 */}
        {PETAL_ANGLES.map(angle => (
          <ellipse
            key={angle}
            cx="50" cy="33" rx="5" ry="14"
            fill="#FFE44D"
            transform={`rotate(${angle} 50 48)`}
          />
        ))}
        {/* 花芯 */}
        <circle cx="50" cy="48" r="11" fill="#E8A020" />
        <circle cx="50" cy="48" r="7"  fill="#C47A10" />
      </g>
    </>
  )
}

// Daisy は常に満開（成長ステージなし）
export default function DaisyBubble({ size, centered = false }: DaisyBubbleProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <BloomSVG cy={centered ? 50 : 28} />
    </svg>
  )
}
