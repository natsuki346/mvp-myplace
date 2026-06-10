'use client'

import { useRouter } from 'next/navigation'
import LightRoomView from './LightRoomView'
import ShadowRoomView from './ShadowRoomView'
import { BottomNav } from '@/src/components/BottomNav'

type RoomType = 'light' | 'shadow'

const TAB_ORDER: RoomType[] = ['light', 'shadow']

const TAB_CONFIG: Record<RoomType, { label: string; icon: string }> = {
  light:  { label: '実の部屋', icon: '🍅' },
  shadow: { label: '根の部屋', icon: '🌱' },
}

const ACTIVE_BG   = '#4A7C59'
const INACTIVE_BG = '#C4B49A'

export default function RoomTabsPage({ type }: { type: RoomType }) {
  const router = useRouter()

  return (
    <div
      className="min-h-screen px-6 pt-12"
      style={{ background: '#F5F0E8', maxWidth: 390, margin: '0 auto', paddingBottom: 120 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: 22 }}>{TAB_CONFIG[type].icon}</span>
        <h1 className="text-xl font-bold" style={{ color: '#3B2F1E' }}>農園が広がる時</h1>
      </div>
      <p className="text-sm mb-6" style={{ color: 'rgba(59,47,30,0.55)' }}>
        同じ土で育つ人と、言葉だけで出会う
      </p>

      {/* タブ */}
      <div className="flex gap-2 mb-6">
        {TAB_ORDER.map(t => {
          const active = t === type
          return (
            <button
              key={t}
              onClick={() => router.replace(`/room/${t}`)}
              className="flex-1 py-3 rounded-xl text-sm font-bold"
              style={{
                background: active ? ACTIVE_BG : INACTIVE_BG,
                color: '#FFFFFF',
                border: 'none', cursor: 'pointer',
              }}
            >
              {TAB_CONFIG[t].icon} {TAB_CONFIG[t].label}
            </button>
          )
        })}
      </div>

      {type === 'light' ? <LightRoomView /> : <ShadowRoomView />}

      <BottomNav />
    </div>
  )
}
