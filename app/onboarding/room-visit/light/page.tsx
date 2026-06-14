'use client'

import { useRouter } from 'next/navigation'
import RoomCardList from '@/app/room/RoomCardList'
import { DaisyIcon } from '@/src/components/icons/DaisyIcon'

export default function LightRoomVisitPage() {
  const router = useRouter()

  return (
    <div
      className="min-h-screen px-6 pt-12 pb-10"
      style={{ background: '#F5F0E8', maxWidth: 390, margin: '0 auto' }}
    >
      <button
        onClick={() => router.push('/canvas?from=light-room')}
        className="text-sm mb-8 flex items-center gap-1"
        style={{ color: 'rgba(59,47,30,0.45)', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        ← もどる
      </button>

      <div className="flex items-center gap-2 mb-2">
        <DaisyIcon size={22} stage={4} active />
        <h1 className="text-xl font-bold" style={{ color: '#3B2F1E' }}>実の部屋</h1>
      </div>
      <p className="text-sm mb-8" style={{ color: 'rgba(59,47,30,0.55)' }}>
        タグを選んで入室してください
      </p>

      <RoomCardList type="light" />
    </div>
  )
}
