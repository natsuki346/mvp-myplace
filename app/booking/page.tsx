'use client'

import { useEffect, useState } from 'react'
import { BottomNav } from '@/src/components/BottomNav'
import UserBookingView from '@/src/components/booking/UserBookingView'
import HostScheduleView from '@/src/components/booking/HostScheduleView'

// 予約タブ。モード（selectedMode）で表示を切り替える：
// user（話を聞いてほしい側）→ 自分の予約の予定・履歴
// host（話を聞いてあげたい側）→ 空き時間登録＋入った予約の管理
export default function BookingPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [mode, setMode] = useState<'user' | 'host' | null>(null)

  useEffect(() => {
    setUserId(localStorage.getItem('user_id'))
    setMode(localStorage.getItem('selectedMode') === 'host' ? 'host' : 'user')
  }, [])

  return (
    <div style={{
      background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
      height: '100svh', overflow: 'hidden', position: 'relative',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ── ヘッダー ── */}
      <div style={{
        padding: 'calc(14px + env(safe-area-inset-top)) 20px 12px', flexShrink: 0,
        borderBottom: '1px solid rgba(139,115,85,0.15)',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E' }}>
          {mode === 'host' ? '📅 スケジュール管理' : '📅 予約'}
        </span>
      </div>

      {/* ── 本体 ── */}
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        padding: '16px 20px calc(96px + env(safe-area-inset-bottom))',
      }}>
        {mode === null || userId === null ? (
          <p style={{ textAlign: 'center', paddingTop: 48, fontSize: 13, color: 'rgba(59,47,30,0.4)' }}>
            読み込み中...
          </p>
        ) : mode === 'host' ? (
          <HostScheduleView userId={userId} />
        ) : (
          <UserBookingView userId={userId} />
        )}
      </div>

      <BottomNav />
    </div>
  )
}
