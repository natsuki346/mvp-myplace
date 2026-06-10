'use client'

import { BottomNav } from '@/src/components/BottomNav'

export default function ProfilePage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: '#F5F0E8', maxWidth: 390, margin: '0 auto', position: 'relative' }}
    >
      <div style={{ padding: '44px 20px 12px' }}>
        <h1 style={{ fontSize: 19, fontWeight: 600, color: '#3B2F1E', margin: 0 }}>
          プロフィール
        </h1>
      </div>

      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#A89880' }}>準備中です</p>
      </div>

      <BottomNav />
    </div>
  )
}
