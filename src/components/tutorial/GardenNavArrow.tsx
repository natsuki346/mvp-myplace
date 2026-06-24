'use client'

import { useNavItemRect } from './useNavItemRect'

const HIGHLIGHT_W = 84
const HIGHLIGHT_H = 56
const ARROW_GAP   = 14
const ARROW_H     = 48

export default function GardenNavArrow() {
  const rect = useNavItemRect('garden')
  if (!rect) return null

  const centerX     = rect.left + rect.width / 2
  const highlightTop = rect.top + rect.height / 2 - HIGHLIGHT_H / 2
  const arrowTop     = highlightTop - ARROW_GAP - ARROW_H

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 150, pointerEvents: 'none' }}>
      {/* ガーデンナビのハイライト */}
      <div
        className="rounded-2xl animate-pulse"
        style={{
          position: 'fixed', left: centerX, top: highlightTop, transform: 'translateX(-50%)',
          width: HIGHLIGHT_W, height: HIGHLIGHT_H,
          border: '2.5px solid #E53935',
          background: 'rgba(229,57,53,0.08)',
        }}
      />

      {/* 吹き出し + 矢印 */}
      <div
        className="flex flex-col items-center"
        style={{ position: 'fixed', left: centerX, top: arrowTop, transform: 'translateX(-50%)' }}
      >
        <div className="flex flex-col items-center animate-bounce">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path
              d="M24 6 L24 38 M12 26 L24 42 L36 26"
              stroke="#E53935"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
