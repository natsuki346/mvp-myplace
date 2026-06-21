'use client'

import { useRouter, usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { icon: '🌿', label: 'ガーデン',     path: '/home' },
  { icon: '🏠', label: 'ルーム',       path: '/room/light' },
  { icon: '👤', label: 'プロフィール', path: '/profile' },
]

type BottomNavProps = {
  onRoomClick?: () => void
  onGardenClick?: () => void
}

export function BottomNav({ onRoomClick, onGardenClick }: BottomNavProps = {}) {
  const router   = useRouter()
  const pathname = usePathname()

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 390, zIndex: 100,
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      background: '#F5F0E8', borderTop: '1px solid rgba(139,115,85,0.15)',
      padding: '10px 0 18px',
    }}>
      {NAV_ITEMS.map(item => {
        const active = item.path === '/room/light'
          ? pathname.startsWith('/room')
          : pathname === item.path
        return (
          <button
            key={item.path}
            onClick={() => {
              if (item.path === '/room/light') onRoomClick?.()
              if (item.path === '/home') onGardenClick?.()
              router.push(item.path)
            }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', cursor: 'pointer',
              color: active ? '#4A7C59' : '#A89880',
              fontWeight: active ? 700 : 500,
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 10 }}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
