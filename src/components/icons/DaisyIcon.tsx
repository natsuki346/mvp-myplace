type Props = {
  size?: number
  stage?: 0 | 1 | 2 | 3 | 4 // 0:タネ 1:芽 2:蕾 3:小花 4:満開
  active?: boolean
}

export function DaisyIcon({ size = 24, stage = 4, active = false }: Props) {
  const cx = size / 2
  const cy = size / 2

  if (stage === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <ellipse cx={cx} cy={cy + 2} rx={size * 0.22} ry={size * 0.28}
          fill="#6B3A0F" transform={`rotate(-10,${cx},${cy + 2})`} />
        <ellipse cx={cx - size * 0.06} cy={cy - size * 0.04} rx={size * 0.08} ry={size * 0.05}
          fill="rgba(255,255,255,0.15)" />
      </svg>
    )
  }

  if (stage === 1) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <ellipse cx={cx} cy={cy + 4} rx={size * 0.18} ry={size * 0.22} fill="#7A4A1A" opacity="0.7" />
        <line x1={cx} y1={cy + 2} x2={cx} y2={cy - size * 0.3}
          stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx={cx - size * 0.12} cy={cy - size * 0.15} rx={size * 0.1} ry={size * 0.06}
          fill="#5A9C6A" transform={`rotate(-30,${cx - size * 0.12},${cy - size * 0.15})`} />
        <ellipse cx={cx + size * 0.12} cy={cy - size * 0.2} rx={size * 0.1} ry={size * 0.06}
          fill="#5A9C6A" transform={`rotate(30,${cx + size * 0.12},${cy - size * 0.2})`} />
      </svg>
    )
  }

  const petalCount = stage >= 4 ? 14 : stage >= 3 ? 12 : 10
  const petalR = size * (stage >= 4 ? 0.36 : stage >= 3 ? 0.28 : 0.22)
  const petalRx = size * (stage >= 4 ? 0.1 : 0.08)
  const petalRy = size * (stage >= 4 ? 0.22 : 0.16)
  const petalFill = '#FFF176'
  const centerR = size * (stage >= 4 ? 0.14 : 0.1)
  const angles = Array.from({ length: petalCount }, (_, i) => i * (360 / petalCount))

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`translate(${cx},${cy})`}>
        {active && (
          <circle cx={0} cy={0} r={petalR + petalRy} fill="#FFF9C4" opacity="0.35" />
        )}
        {angles.map((angle, i) => (
          <ellipse key={i} cx={0} cy={-petalR} rx={petalRx} ry={petalRy}
            fill={petalFill} stroke="#F9D900" strokeWidth="0.5"
            transform={`rotate(${angle})`} />
        ))}
        <circle cx={0} cy={0} r={centerR} fill="#F9A825" stroke="#F57F17" strokeWidth="0.5" />
        <circle cx={0} cy={0} r={centerR * 0.55} fill="#E65100" />
      </g>
    </svg>
  )
}
