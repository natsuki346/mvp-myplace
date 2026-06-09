'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'

type Tag = { id: string; text: string; color: string }

export default function RoomShadowPage() {
  const router = useRouter()
  const [tags,    setTags]    = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = sessionStorage.getItem('user_id')
    if (!userId) { setLoading(false); return }
    supabase
      .from('tags')
      .select('id, text, color')
      .eq('user_id', userId)
      .eq('type', 'shadow')
      .then(({ data }) => {
        setTags((data as Tag[]) ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div
      className="min-h-screen px-6 pt-12 pb-10"
      style={{ background: '#1a1a2e', maxWidth: 390, margin: '0 auto' }}
    >

      <button
        onClick={() => router.push('/canvas?from=shadow-room')}
        className="text-sm mb-8 flex items-center gap-1"
        style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        ← もどる
      </button>

      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: 22 }}>🌙</span>
        <h1 className="text-xl font-bold text-white">根の部屋</h1>
      </div>
      <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.38)' }}>
        タグを選んで入室してください
      </p>

      {loading ? (
        <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.28)' }}>読み込み中...</p>
      ) : tags.length === 0 ? (
        <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.28)' }}>タグが見つかりません</p>
      ) : (
        <div className="flex flex-col gap-3">
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => router.push('/room/shadow/' + encodeURIComponent(tag.text))}
              className="w-full text-left px-5 py-4 rounded-2xl flex items-center justify-between transition-opacity hover:opacity-70"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.10)' }}
            >
              <span className="text-base font-semibold" style={{ color: tag.color || 'rgba(200,185,240,0.9)' }}>
                {tag.text}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 18 }}>›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
