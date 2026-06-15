'use client'

import { useEffect, useState } from 'react'
import GardenDisplay from '../home/garden-display'
import { BottomNav } from '@/src/components/BottomNav'
import { RoomInviteModal } from '@/src/components/canvas/RoomInviteModal'
import { isRoomOnboardingDone, markRoomOnboardingDone } from '@/src/lib/onboarding'

// ── 完了モーダル ───────────────────────────────────────────────────────────────

function CompleteModal({ onClose }: { onClose: () => void }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])
  const close = () => {
    setVisible(false)
    setTimeout(onClose, 380)
  }
  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: visible ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
        transition: 'background 0.38s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          opacity:    visible ? 1 : 0,
          transform:  visible ? 'translateY(0px)' : 'translateY(16px)',
          transition: 'opacity 0.38s ease, transform 0.38s ease',
          background: 'white',
          borderRadius: 20,
          padding: '40px 28px',
          width: '100%', maxWidth: 300,
          textAlign: 'center',
          boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
        }}
      >
        <p style={{ fontSize: 40, margin: '0 0 12px' }}>✅</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px', lineHeight: 1.5 }}>
          あなたの部屋が完成しました！
        </p>
        <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', margin: '0 0 28px', lineHeight: 1.6 }}>
          いつでもここに戻ってこれます
        </p>
        <button
          onClick={close}
          style={{
            width: '100%', padding: '14px', borderRadius: 30, border: 'none',
            background: '#1a1a1a', color: 'white',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >はじめる</button>
      </div>
    </div>
  )
}

// ── キャンバス（オンボーディング後の農園画面） ─────────────────────────────────

type ModalState = 'none' | 'invite-light' | 'invite-shadow' | 'complete'

export default function CanvasPage() {
  const [modalState, setModalState] = useState<ModalState>('none')

  const finishRoomOnboarding = () => {
    markRoomOnboardingDone()
    setModalState('complete')
  }

  // モーダル表示制御
  useEffect(() => {
    // 初期設定が完了済みなら、案内モーダルは一切表示しない
    if (isRoomOnboardingDone()) return

    // URLパラメータ from= を優先チェック（Room一覧から戻ってきた場合）
    const from = new URLSearchParams(window.location.search).get('from')
    if (from === 'light-room') {
      // 光の部屋から → 1秒後に影の部屋誘導ポップアップ
      const t = setTimeout(() => setModalState('invite-shadow'), 1000)
      return () => clearTimeout(t)
    }
    if (from === 'shadow-room') {
      // 影の部屋から → 1秒後に完了モーダル
      const t = setTimeout(() => finishRoomOnboarding(), 1000)
      return () => clearTimeout(t)
    }

    // sessionStorage フラグを次に確認（後方互換）
    const showComplete = sessionStorage.getItem('show_complete_modal')
    if (showComplete) {
      sessionStorage.removeItem('show_complete_modal')
      const t = setTimeout(() => finishRoomOnboarding(), 0)
      return () => clearTimeout(t)
    }
    const showShadow = sessionStorage.getItem('show_shadow_modal')
    if (showShadow) {
      sessionStorage.removeItem('show_shadow_modal')
      const t = setTimeout(() => setModalState('invite-shadow'), 0)
      return () => clearTimeout(t)
    }

    // 通常フロー: 1秒後に光の部屋誘導
    const t = setTimeout(() => setModalState('invite-light'), 1000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="min-h-screen"
      style={{ background: '#F5F0E8', maxWidth: 390, margin: '0 auto', position: 'relative' }}
    >
      {/* ────────────────── ヘッダー ────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '44px 20px 12px',
      }}>
        <h1 style={{ fontSize: 19, fontWeight: 600, color: '#3B2F1E', margin: 0 }}>
          あなたのガーデン
        </h1>
      </div>

      {/* ────────────────── 農園表示 ────────────────── */}
      <div style={{ paddingBottom: 84 }}>
        <GardenDisplay />
      </div>

      <BottomNav />

      {/* ── 部屋誘導モーダル ── */}
      {(modalState === 'invite-light' || modalState === 'invite-shadow') && (
        <RoomInviteModal
          initialStep={modalState === 'invite-shadow' ? 'shadow' : 'light'}
          onDismiss={() => setModalState('none')}
          onShadowDecline={finishRoomOnboarding}
        />
      )}

      {/* ── 完了✅モーダル ── */}
      {modalState === 'complete' && (
        <CompleteModal onClose={() => setModalState('none')} />
      )}
    </div>
  )
}
