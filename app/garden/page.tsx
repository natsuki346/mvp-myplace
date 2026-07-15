'use client'

import { useRouter } from 'next/navigation'
import GardenTagCloud from '@/src/components/GardenTagCloud'

// プロフィール（ProfileDrawer）の「MyGarden」から遷移する全画面ガーデン。
// バブル表示（garden-display.tsx）は他画面でも使うため、ここではタグクラウド表示にする。
export default function GardenPage() {
  const router = useRouter()

  return (
    <div style={{
      background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
      height: '100svh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* ── ヘッダー（戻るボタン・iOSセーフエリア考慮） ── */}
      <div style={{
        padding: 'calc(12px + env(safe-area-inset-top)) 20px 12px', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, color: '#3B2F1E', padding: 0,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          ← 戻る
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>🌿 MyGarden</span>
      </div>

      {/* ── タグクラウド本体 ── */}
      <GardenTagCloud />
    </div>
  )
}
