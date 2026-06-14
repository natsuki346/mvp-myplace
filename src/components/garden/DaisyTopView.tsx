'use client'

import type { PointerEvent } from 'react'

const PETAL_COUNT = 13
const PETAL_ANGLE_STEP = 360 / PETAL_COUNT
const PETAL_ANGLES = Array.from({ length: PETAL_COUNT }, (_, i) => i * PETAL_ANGLE_STEP)

// 花の中心のつぶつぶ（6個・60deg間隔）の単位ベクトル
// Math.cos/sinの実行時計算はSSR/CSRでハイドレーションミスマッチを起こすため、事前計算した固定値を使う
const DOT_UNIT_VECTORS = [
  { dx: 1, dy: 0 },
  { dx: 0.5, dy: 0.866 },
  { dx: -0.5, dy: 0.866 },
  { dx: -1, dy: 0 },
  { dx: -0.5, dy: -0.866 },
  { dx: 0.5, dy: -0.866 },
]

type DaisyTopViewProps = {
  cx: number
  cy: number
  size: number
  label: string
  onClick?: () => void
  onDelete?: () => void
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void
}

// 俯瞰花畑用：上から見たデイジー（実の部屋・光タグ）
export default function DaisyTopView({ cx, cy, size, label, onClick, onDelete, onPointerDown }: DaisyTopViewProps) {
  const petalDist = size * 0.33
  const petalW = size * 0.10
  const petalH = size * 0.18
  const dotDist = size * 0.05

  return (
    <div
      onClick={onClick}
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        left: cx, top: cy,
        transform: 'translate(-50%, -50%)',
        width: size, height: size,
        cursor: onClick || onPointerDown ? 'pointer' : undefined,
        touchAction: onPointerDown ? 'none' : undefined,
      }}
    >
      <svg
        width={size} height={size}
        viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
      >
        {/* 影 */}
        <ellipse cx="0" cy={size * 0.36} rx={size * 0.3} ry={size * 0.08} fill="#000000" opacity="0.06" />

        {/* 花びら13枚 */}
        {PETAL_ANGLES.map((angle, i) => (
          <ellipse
            key={angle}
            cx="0" cy={-petalDist} rx={petalW} ry={petalH}
            fill={i % 2 === 0 ? '#F5D060' : '#F0CA50'}
            transform={`rotate(${angle})`}
          />
        ))}

        {/* 花の中心：3重円 */}
        <circle cx="0" cy="0" r={size * 0.19} fill="#C47A10" />
        <circle cx="0" cy="0" r={size * 0.145} fill="#D98C18" />
        <circle cx="0" cy="0" r={size * 0.10} fill="#E8A020" />

        {/* つぶつぶ */}
        {DOT_UNIT_VECTORS.map(({ dx, dy }, i) => (
          <circle key={i} cx={dx * dotDist} cy={dy * dotDist} r={2} fill="#C47A10" opacity="0.7" />
        ))}
      </svg>

      {/* ハッシュタグピル */}
      <span
        style={{
          position: 'absolute', left: '50%', top: -size * 0.6,
          transform: 'translate(-50%, -50%)',
          background: '#F5D78E', color: '#8B6914',
          fontSize: 10, fontWeight: 600,
          borderRadius: 12, padding: '3px 10px',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>

      {/* 削除ボタン（左上） */}
      {onDelete && (
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete() }}
          style={{
            position: 'absolute', top: -8, left: -8,
            width: 20, height: 20, borderRadius: '50%',
            background: '#E05050', color: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, lineHeight: 1,
            border: 'none', padding: 0, cursor: 'pointer',
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
