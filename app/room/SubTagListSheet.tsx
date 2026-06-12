'use client'

import { useEffect, useState } from 'react'
import { getMatchingTags } from '@/src/lib/supabase/rooms'
import { getSubTags, type SubTag } from '@/src/lib/supabase/subtags'
import { formatHashtag } from '@/app/onboarding/garden-setup/garden-visuals'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'
import CreateChannelModal from './CreateChannelModal'

type RoomType = 'light' | 'shadow'

export type SelectedChannel = { subTagId: string | null; name: string }

export default function SubTagListSheet({
  type,
  tag,
  onClose,
  onSelect,
}: {
  type: RoomType
  tag: { id: string; text: string }
  onClose: () => void
  onSelect: (channel: SelectedChannel) => void
}) {
  const [visible, setVisible] = useState(false)
  const [subTags, setSubTags] = useState<SubTag[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [chatVisited, setChatVisited] = useState(false)
  const { step } = useTutorialStep()
  // 実の部屋（room_chat_mi）は「戻って次に進もう」が出たら「まずここをのぞいてみよう」を消す
  const showAllArrow = (step === 'room_chat_mi' && !chatVisited) || step === 'room_chat_ne'
  // 実の部屋（room_chat_mi）はチャットを一度のぞくまで「戻って次に進もう」を出さない
  const showBackBubble = step === 'watering' || (step === 'room_chat_mi' && chatVisited)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const matches = await getMatchingTags(tag.text, type)
      const ids = matches.map(m => m.id)
      const data = await getSubTags(ids.length > 0 ? ids : [tag.id])
      if (!cancelled) { setSubTags(data); setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [tag.id, tag.text, type])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const handleCreated = (subTag: SubTag) => {
    setSubTags(prev => [...prev, subTag])
    setShowCreate(false)
    handleSelect({ subTagId: subTag.id, name: subTag.name })
  }

  const handleSelect = (channel: SelectedChannel) => {
    setChatVisited(true)
    onSelect(channel)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 290, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      {/* 背景オーバーレイ */}
      <div
        onClick={close}
        style={{
          position: 'absolute', inset: 0,
          background: visible ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
          transition: 'background 0.3s ease',
        }}
      />

      {/* シート本体（下からスライドアップ） */}
      <div
        className="flex flex-col"
        style={{
          position: 'relative', width: '100%', maxWidth: 390, height: '100%',
          background: '#F5F0E8',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s ease',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          flexShrink: 0, padding: '16px 20px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ position: 'relative', display: 'inline-block', minWidth: 120 }}>
            <button
              onClick={close}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#3B2F1E', padding: 0 }}
            >← 戻る</button>

            {/* チュートリアル：戻るボタンの真下中央に吹き出し（次のステップへ誘導） */}
            {showBackBubble && (
              <div
                style={{
                  position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                  marginTop: 8, whiteSpace: 'nowrap', zIndex: 50, pointerEvents: 'none',
                }}
              >
                <div style={{ position: 'relative' }}>
                  {/* 上向き三角（赤枠） */}
                  <div style={{
                    position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                    width: 0, height: 0,
                    borderLeft: '7px solid transparent',
                    borderRight: '7px solid transparent',
                    borderBottom: '7px solid #DC2626',
                  }} />
                  {/* 三角の白い内側 */}
                  <div style={{
                    position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                    width: 0, height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderBottom: '6px solid white',
                    marginBottom: -1,
                  }} />
                  {/* 吹き出し本体 */}
                  <div style={{
                    background: 'white',
                    border: '1.5px solid #DC2626',
                    borderRadius: 12,
                    padding: '6px 14px',
                    fontSize: 12,
                    color: '#DC2626',
                    whiteSpace: 'nowrap',
                  }}>
                    {step === 'watering' ? '戻って水を撒こう' : '戻って次に進もう'}
                  </div>
                </div>
              </div>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>{formatHashtag(tag.text)}</p>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* ALL */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => handleSelect({ subTagId: null, name: tag.text })}
              style={{
                display: 'flex', alignItems: 'center', width: '100%', height: 56, padding: '0 20px',
                background: '#D4EED8', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: '#4A7C59' }}>💬 ALL</span>
            </button>

            {/* チュートリアル：ALLを指す矢印 */}
            {showAllArrow && (
              <div
                className="absolute flex items-center gap-2 animate-bounce"
                style={{ top: 0, bottom: 0, right: 16, zIndex: 5, pointerEvents: 'none' }}
              >
                <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
                  <path
                    d="M42 24 L10 24 M22 12 L8 24 L22 36"
                    stroke="#E53935"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div
                  className="rounded-xl px-3 py-2"
                  style={{
                    background: '#fff',
                    border: '1.5px solid #E53935',
                    color: '#E53935',
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  まずここをのぞいてみよう
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(59,47,30,0.5)', marginTop: 24 }}>読み込み中...</p>
          ) : (
            subTags.map(st => (
              <button
                key={st.id}
                onClick={() => handleSelect({ subTagId: st.id, name: st.name })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%', height: 56, padding: '0 20px',
                  background: '#FFFFFF', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ color: '#8B6914', fontSize: 14, fontWeight: 600 }}>#</span>
                <span style={{ fontSize: 14, color: '#3B2F1E' }}>{st.name}</span>
              </button>
            ))
          )}

          {/* チャンネル作成 */}
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'block', width: '100%', padding: 16, textAlign: 'left',
              background: 'none', border: 'none',
              color: '#4A7C59', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >＋ チャンネルを作る</button>
        </div>
      </div>

      {showCreate && (
        <CreateChannelModal
          parentTagId={tag.id}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
