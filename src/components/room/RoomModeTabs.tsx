'use client'

import { useRouter } from 'next/navigation'
import { DaisyIcon } from '@/src/components/icons/DaisyIcon'

// PC（md以上）専用：チャット画面上部に常時表示するモードタブ（Daisy / Seed / Private）。
// チャットに入っても他モードへ切り替えられるようにするためのナビ。スマホでは非表示。
//  - active なタブはタップしても何もしない（現在地）
//  - それ以外は該当ルームのトップ（バブル一覧）へ遷移する

type Mode = 'light' | 'shadow' | 'friend'

const TABS: { key: Mode; label: string; icon: string; path: string }[] = [
  { key: 'light',  label: 'Daisy',   icon: '🌼', path: '/room/light' },
  { key: 'shadow', label: 'Seed',    icon: '🌱', path: '/room/shadow' },
  { key: 'friend', label: 'Private', icon: '💬', path: '/room/friend' },
]

const ACTIVE_BG     = '#4A7C59'
const ACTIVE_TEXT   = '#F5F0E8'
const INACTIVE_BG   = '#D4B896'
const INACTIVE_TEXT = '#5C3A1E'

export default function RoomModeTabs({
  active,
  className = '',
}: {
  active: Mode
  className?: string
}) {
  const router = useRouter()
  return (
    <div
      className={`hidden md:flex gap-2 px-6 py-3 shrink-0 border-b border-[rgba(139,115,85,0.2)] ${className}`}
      style={{ background: '#F5F0E8' }}
    >
      {TABS.map(t => {
        const isActive = t.key === active
        return (
          <button
            key={t.key}
            onClick={() => { if (!isActive) router.push(t.path) }}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
            style={{
              background: isActive ? ACTIVE_BG : INACTIVE_BG,
              color: isActive ? ACTIVE_TEXT : INACTIVE_TEXT,
              border: 'none', cursor: isActive ? 'default' : 'pointer',
            }}
          >
            {t.key === 'light'
              ? <DaisyIcon size={16} stage={4} active={isActive} />
              : <span>{t.icon}</span>}
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
