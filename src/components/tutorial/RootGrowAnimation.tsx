'use client'

import { useEffect, useState } from 'react'
import WateringAnimation from './WateringAnimation'

type RootGrowAnimationProps = {
  onComplete: () => void
}

export const ROOT_GROW_SHOWN_KEY = 'whyme_root_grow_shown'

const ROOTS = [
  { d: 'M80 130 Q82 170 80 220', strokeWidth: 3,   className: 'animate-growRoot1' },
  { d: 'M78 110 Q55 150 45 195', strokeWidth: 2,   className: 'animate-growRoot2' },
  { d: 'M82 110 Q105 150 115 195', strokeWidth: 2, className: 'animate-growRoot3' },
  { d: 'M76 120 Q58 165 50 215', strokeWidth: 1.5, className: 'animate-growRoot4' },
  { d: 'M84 120 Q102 165 110 215', strokeWidth: 1.5, className: 'animate-growRoot5' },
] as const

// 最後の根（delay 0.9s + duration 0.7s）が伸びきってから1秒後に閉じる
const GROWING_DURATION = 0.9 * 1000 + 0.7 * 1000 + 1000

export default function RootGrowAnimation({ onComplete }: RootGrowAnimationProps) {
  const [phase, setPhase] = useState<'watering' | 'growing'>('watering')

  useEffect(() => {
    sessionStorage.setItem(ROOT_GROW_SHOWN_KEY, '1')
  }, [])

  useEffect(() => {
    if (phase !== 'growing') return
    const t = setTimeout(onComplete, GROWING_DURATION)
    return () => clearTimeout(t)
  }, [phase, onComplete])

  if (phase === 'watering') {
    return <WateringAnimation onComplete={() => setPhase('growing')} />
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ zIndex: 280, maxWidth: 390, margin: '0 auto', background: 'rgba(59,47,30,0.6)' }}
    >
      <svg width="240" height="320" viewBox="0 0 160 240" style={{ display: 'block' }}>
        {/* 土の表面層 */}
        <path d="M0,70 C40,52 90,78 160,58 L160,240 L0,240 Z" fill="#C4A882" />
        {/* 土の中層 */}
        <path d="M0,140 L160,140 L160,240 L0,240 Z" fill="#A98759" opacity="0.7" />
        {/* 土の深層 */}
        <path d="M0,195 L160,195 L160,240 L0,240 Z" fill="#8B6914" opacity="0.4" />

        {/* 種 */}
        <ellipse cx="80" cy="98" rx="30" ry="35" fill="#6B4E0F" />
        <ellipse cx="69" cy="84" rx="9" ry="6" fill="#F5D78E" opacity="0.6" />

        {/* 根っこ：水やり後に下方向へ伸びる */}
        {ROOTS.map((root, i) => (
          <path
            key={i}
            d={root.d}
            stroke="#8B6914"
            strokeWidth={root.strokeWidth}
            strokeLinecap="round"
            fill="none"
            pathLength={100}
            strokeDasharray={100}
            className={root.className}
          />
        ))}
      </svg>

      <p className="text-sm mt-4 text-center" style={{ color: '#D4B896' }}>
        根っこが伸びています…
      </p>
    </div>
  )
}
