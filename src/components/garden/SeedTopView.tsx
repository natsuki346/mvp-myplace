'use client'

import { useId } from 'react'
import type { PointerEvent } from 'react'

type SeedTopViewProps = {
  cx: number
  cy: number
  size: number
  label: string
  onClick?: () => void
  onDelete?: () => void
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void
}

// 土壌透視用：上から見たタネ（根の部屋・影タグ）
export default function SeedTopView({ cx, cy, size, label, onClick, onDelete, onPointerDown }: SeedTopViewProps) {
  const gradientId = useId()

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
        <defs>
          <radialGradient id={gradientId} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#C9A876" />
            <stop offset="60%" stopColor="#9C7448" />
            <stop offset="100%" stopColor="#6E4B28" />
          </radialGradient>
        </defs>

        {/* 土に埋まっている範囲 */}
        <ellipse cx="0" cy={size * 0.051} rx={size * 0.561} ry={size * 0.408} fill="#8B6F47" opacity={0.35} />

        {/* タネ本体（控えめな雫型） */}
        <path
          d={`M 0 ${-size * 0.204}
              C ${size * 0.116} ${-size * 0.192} ${size * 0.116} ${size * 0.116} 0 ${size * 0.204}
              C ${-size * 0.116} ${size * 0.116} ${-size * 0.116} ${-size * 0.192} 0 ${-size * 0.204}
              Z`}
          fill={`url(#${gradientId})`}
          opacity={0.85}
        />

        {/* タネにかぶる土粒（半分埋まっている表現） */}
        <circle cx={size * 0.065} cy={size * 0.128} r={size * 0.056} fill="#8B6F47" opacity={0.6} />
        <circle cx={-size * 0.077} cy={size * 0.153} r={size * 0.041} fill="#8B6F47" opacity={0.55} />

        {/* 周辺の土粒テクスチャ */}
        <circle cx={-size * 0.383} cy={-size * 0.128} r={size * 0.038} fill="#6E4B28" opacity={0.4} />
        <circle cx={size * 0.357} cy={size * 0.179} r={size * 0.033} fill="#6E4B28" opacity={0.4} />
        <circle cx={size * 0.255} cy={-size * 0.255} r={size * 0.031} fill="#6E4B28" opacity={0.35} />
      </svg>

      {/* ハッシュタグピル */}
      <span
        style={{
          position: 'absolute', left: '50%', top: -size * 0.561,
          transform: 'translate(-50%, -50%)',
          background: 'rgba(212,184,150,0.9)', color: '#5C3A1E',
          fontSize: 10, fontWeight: 600,
          borderRadius: 10, padding: '3px 10px',
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
