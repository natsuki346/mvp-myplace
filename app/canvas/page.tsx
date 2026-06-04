'use client'

import { useEffect, useState } from 'react'
import { CanvasView } from '@/src/components/canvas/CanvasView'
import { RoomInviteModal } from '@/src/components/canvas/RoomInviteModal'
import { supabase } from '@/src/lib/supabase/client'

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

// ── Types ──────────────────────────────────────────────────────────────────────

type ItemKind = 'tag' | 'avatar' | 'shadow-tag'
type Item = {
  id: string; kind: ItemKind; content: string
  x: number; y: number; size: number; rotation: number
  color?: string; count?: number
}

const AVATAR: Item = { id: 'avatar', kind: 'avatar', content: '', x: 50, y: 46, size: 108, rotation: 0 }

function toItems(rows: { id: string; text: string; type: 'light' | 'shadow'; color: string; position_x: number; position_y: number }[]): { light: Item[]; shadow: Item[] } {
  return {
    light: [
      AVATAR,
      ...rows.filter(r => r.type === 'light').map(r => ({
        id: r.id, kind: 'tag' as const, content: r.text,
        x: r.position_x * 100, y: r.position_y * 100,
        size: 14, rotation: 0, color: r.color,
      })),
    ],
    shadow: [
      { ...AVATAR, id: 'avatar-shadow' },
      ...rows.filter(r => r.type === 'shadow').map(r => ({
        id: r.id, kind: 'shadow-tag' as const, content: r.text,
        x: r.position_x * 100, y: r.position_y * 100,
        size: 14, rotation: 0, color: r.color, count: 0,
      })),
    ],
  }
}

export default function CanvasPage() {
  const [lightItems,  setLightItems]  = useState<Item[] | undefined>(undefined)
  const [shadowItems, setShadowItems] = useState<Item[] | undefined>(undefined)
  const [loaded,      setLoaded]      = useState(false)
  type ModalState = 'none' | 'invite-light' | 'invite-shadow' | 'complete'
  const [modalState, setModalState]  = useState<ModalState>('none')

  useEffect(() => {
    const userId = sessionStorage.getItem('user_id')
    if (!userId) { setLoaded(true); return }
    supabase
      .from('tags')
      .select('id, text, type, color, position_x, position_y')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const { light, shadow } = toItems(data as Parameters<typeof toItems>[0])
          setLightItems(light)
          setShadowItems(shadow)
        }
        setLoaded(true)
      })
  }, [])

  // モーダル表示制御
  useEffect(() => {
    if (!loaded) return

    // sessionStorage フラグを優先チェック（Room画面から戻ってきた場合）
    const showComplete = sessionStorage.getItem('show_complete_modal')
    if (showComplete) {
      sessionStorage.removeItem('show_complete_modal')
      setModalState('complete')
      return
    }
    const showShadow = sessionStorage.getItem('show_shadow_modal')
    if (showShadow) {
      sessionStorage.removeItem('show_shadow_modal')
      setModalState('invite-shadow')
      return
    }

    // 通常フロー: 3秒後に光の部屋誘導
    const t = setTimeout(() => setModalState('invite-light'), 3000)
    return () => clearTimeout(t)
  }, [loaded])

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <span className="text-white/30 text-sm">読み込み中...</span>
      </div>
    )
  }

  return (
    <>
      <CanvasView
        initialLightItems={lightItems}
        initialShadowItems={shadowItems}
      />
      {/* ── 部屋誘導モーダル ── */}
      {(modalState === 'invite-light' || modalState === 'invite-shadow') && (
        <RoomInviteModal
          initialStep={modalState === 'invite-shadow' ? 'shadow' : 'light'}
          onDismiss={() => setModalState('none')}
          onShadowDecline={() => setModalState('complete')}
        />
      )}

      {/* ── 完了✅モーダル ── */}
      {modalState === 'complete' && (
        <CompleteModal onClose={() => setModalState('none')} />
      )}
    </>
  )
}
