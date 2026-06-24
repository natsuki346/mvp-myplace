'use client'

export interface DaisyBubbleProps {
  size: number
}

const PETAL_ANGLES = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324]

// 葉・茎は描かず、花を縮小。下側はハッシュタグ表示用に空け、花は残りの表示エリア
// （上から56%、y=0〜56）の中央（y=28）に来るよう配置する
function BloomSVG() {
  return (
    <>
      <circle cx="50" cy="50" r="50" fill="#F5D78E" />
      <g transform="translate(50 28) scale(0.7) translate(-50 -48)">
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
export default function DaisyBubble({ size }: DaisyBubbleProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <BloomSVG />
    </svg>
  )
}
