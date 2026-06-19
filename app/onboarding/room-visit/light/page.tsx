'use client'

import { useRouter } from 'next/navigation'
import RoomCardList from '@/app/room/RoomCardList'
import { DaisyIcon } from '@/src/components/icons/DaisyIcon'

export default function LightRoomVisitPage() {
  const router = useRouter()

  return (
    <div
      style={{
        minHeight: '100svh', paddingTop: 48, paddingBottom: 120,
        paddingLeft: 24, paddingRight: 24,
        background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <DaisyIcon size={22} stage={4} active />
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#3B2F1E', margin: 0 }}>Daisy</h1>
      </div>
      <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.55)', marginBottom: 28, marginTop: 0 }}>
        タグを選んで入室してみよう
      </p>

      <RoomCardList type="light" />

      {/* 次へボタン */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 390,
        padding: '16px 24px 32px',
        background: 'linear-gradient(to bottom, transparent, #F5F0E8 40%)',
      }}>
        <button
          onClick={() => router.push('/onboarding/room-visit/shadow')}
          style={{
            width: '100%', padding: '14px', borderRadius: 24, border: 'none',
            background: '#4A7C59', color: '#FFFFFF',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          次へ → Seed ルームを見る
        </button>
      </div>

    </div>
  )
}
