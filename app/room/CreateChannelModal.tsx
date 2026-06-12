'use client'

import { useState } from 'react'
import { createSubTag, type SubTag } from '@/src/lib/supabase/subtags'

const MAX_LEN = 20

export default function CreateChannelModal({
  parentTagId,
  onClose,
  onCreated,
}: {
  parentTagId: string
  onClose: () => void
  onCreated: (subTag: SubTag) => void
}) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const trimmed = name.trim()
  const valid = trimmed.length > 0 && trimmed.length <= MAX_LEN

  const handleCreate = async () => {
    if (!valid || submitting) return
    const userId = sessionStorage.getItem('user_id')
    if (!userId) return

    setSubmitting(true)
    const subTag = await createSubTag(parentTagId, userId, trimmed)
    setSubmitting(false)

    if (subTag) onCreated(subTag)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 295,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 320, background: '#FFFFFF', borderRadius: 16, padding: 24 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>
          新しいチャンネルを作る
        </h2>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="例：存在意義を感じたい"
          maxLength={MAX_LEN}
          style={{
            width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 12,
            border: '1px solid #D4B896', outline: 'none',
            fontSize: 14, color: '#3B2F1E', marginBottom: 16,
          }}
        />
        <button
          onClick={handleCreate}
          disabled={!valid || submitting}
          style={{
            width: '100%', padding: 14, borderRadius: 24, border: 'none',
            background: '#4A7C59', color: '#FFFFFF',
            fontSize: 14, fontWeight: 700,
            opacity: valid && !submitting ? 1 : 0.5,
            cursor: valid && !submitting ? 'pointer' : 'default',
          }}
        >作成する</button>
        <button
          onClick={onClose}
          style={{
            display: 'block', width: '100%', marginTop: 8, padding: 0,
            background: 'none', border: 'none',
            color: '#8B6914', fontSize: 13, cursor: 'pointer',
          }}
        >キャンセル</button>
      </div>
    </div>
  )
}
