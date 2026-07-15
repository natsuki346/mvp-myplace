'use client'

import { useRouter } from 'next/navigation'
import HostList from '@/src/components/HostList'

export default function SosPage() {
  const router = useRouter()

  return (
    <div style={{
      background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
      height: '100svh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* ── ヘッダー（戻る・iOSセーフエリア） ── */}
      <div style={{
        padding: 'calc(12px + env(safe-area-inset-top)) 20px 12px', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid rgba(139,115,85,0.15)',
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
        <span style={{ fontSize: 15, fontWeight: 700, color: '#C0392B' }}>今すぐ話せる人</span>
      </div>

      {/* ── 一覧 ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px calc(24px + env(safe-area-inset-bottom))' }}>
        <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.6)', margin: '0 0 14px', textAlign: 'center' }}>
          いま対応できる人につなぎます
        </p>
        <HostList />
      </div>
    </div>
  )
}
