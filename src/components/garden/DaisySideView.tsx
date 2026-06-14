type Props = {
  x: number
  stemBottomY: number
  stemHeight: number
  tagLabel: string
  stage?: number
  active?: boolean
}

const STEM_COLOR = '#4A7C59'
const LEAF_DARK = '#3D7048'
const LEAF_LIGHT = '#4A7C59'
const PETAL_FILL = '#F5D78E'

const PETAL_COUNT = 9
const PETAL_ANGLES = Array.from({ length: PETAL_COUNT }, (_, i) => i * (360 / PETAL_COUNT))

// 実の部屋・横向きデイジー：x（茎の中心）・stemBottomY（地面ライン）・stemHeight（茎の高さ）を基準に描画
export function DaisySideView({ x, stemBottomY, stemHeight, tagLabel, active = false }: Props) {
  const flowerY = stemBottomY - stemHeight
  const midY = stemBottomY - stemHeight / 2
  const pillWidth = tagLabel.length * 8 + 24
  const pillY = flowerY - 90

  return (
    <g>
      {/* 茎 */}
      <line x1={x} y1={stemBottomY} x2={x} y2={flowerY}
        stroke={STEM_COLOR} strokeWidth={5} strokeLinecap="round" />

      {/* 根元の葉（放射状6枚、地面スレスレ） */}
      <ellipse cx={x - 24} cy={stemBottomY - 1} rx={24} ry={8} fill={LEAF_DARK} transform={`rotate(-4 ${x - 24} ${stemBottomY - 1})`} />
      <ellipse cx={x + 24} cy={stemBottomY - 1} rx={24} ry={8} fill={LEAF_LIGHT} transform={`rotate(4 ${x + 24} ${stemBottomY - 1})`} />
      <ellipse cx={x - 15} cy={stemBottomY + 6} rx={17} ry={6} fill={LEAF_LIGHT} transform={`rotate(-32 ${x - 15} ${stemBottomY + 6})`} />
      <ellipse cx={x + 15} cy={stemBottomY + 6} rx={17} ry={6} fill={LEAF_DARK} transform={`rotate(32 ${x + 15} ${stemBottomY + 6})`} />
      <ellipse cx={x - 13} cy={stemBottomY - 14} rx={15} ry={5} fill={LEAF_DARK} transform={`rotate(-55 ${x - 13} ${stemBottomY - 14})`} />
      <ellipse cx={x + 13} cy={stemBottomY - 14} rx={15} ry={5} fill={LEAF_LIGHT} transform={`rotate(55 ${x + 13} ${stemBottomY - 14})`} />

      {/* 茎の中ほどの葉 */}
      <ellipse cx={x - 12} cy={midY} rx={14} ry={7} fill={LEAF_LIGHT} transform={`rotate(-30 ${x - 12} ${midY})`} />
      <ellipse cx={x + 12} cy={midY} rx={14} ry={7} fill={LEAF_LIGHT} transform={`rotate(30 ${x + 12} ${midY})`} />

      {/* 花 */}
      <g transform={`translate(${x} ${flowerY})`}>
        {active && (
          <circle cx={0} cy={0} r={55} fill="#FFF9C4" opacity={0.35} />
        )}
        {PETAL_ANGLES.map(angle => (
          <ellipse key={angle} cx={0} cy={-33} rx={12} ry={22} fill={PETAL_FILL} transform={`rotate(${angle})`} />
        ))}
        <circle cx={0} cy={0} r={18} fill="#E8A020" />
        <circle cx={0} cy={0} r={10} fill="#C47A10" />
      </g>

      {/* ハッシュタグピル */}
      <rect x={x - pillWidth / 2} y={pillY} width={pillWidth} height={24} rx={12} fill={PETAL_FILL} />
      <text x={x} y={pillY + 16} textAnchor="middle" fontSize={11} fontWeight={600} fill="#8B6914">
        {tagLabel}
      </text>
    </g>
  )
}
