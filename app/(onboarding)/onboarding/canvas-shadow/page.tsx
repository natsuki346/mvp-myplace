'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CanvasEditor, type TagItem } from '@/src/components/onboarding/CanvasEditor'
import { supabase } from '@/src/lib/supabase/client'
import { deactivateTag } from '@/src/lib/supabase/events'

export default function CanvasShadowPage() {
  const router = useRouter()
  const [shadowTags, setShadowTags] = useState<string[]>([])

  useEffect(() => {
    const raw = sessionStorage.getItem('onboarding_tags')
    if (!raw) return
    const { shadowTags: s } = JSON.parse(raw) as { shadowTags: string[] }
    setShadowTags(s ?? [])
  }, [])

  const proceed = (items?: TagItem[]) => {
    if (items) {
      const raw     = sessionStorage.getItem('onboarding_tags')
      const current = raw ? JSON.parse(raw) : {}
      sessionStorage.setItem('onboarding_tags', JSON.stringify({ ...current, shadowItems: items }))
    }
    router.push('/canvas')
  }

  // × 削除時：Supabase でタグ ID を検索して deactivated 記録
  const handleRemoveTag = (tagText: string) => {
    const userId = sessionStorage.getItem('user_id')
    if (!userId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('tags') as any)
      .select('id')
      .eq('user_id', userId)
      .eq('text', tagText)
      .maybeSingle()
      .then(({ data }: { data: { id: string } | null }) => {
        if (data?.id) deactivateTag(data.id, userId)
      })
  }

  return (
    <CanvasEditor
      variant="shadow"
      title="影キャンバス"
      icon="🌙"
      initialTags={shadowTags}
      onComplete={proceed}
      onSkip={() => proceed()}
      onRemoveTag={handleRemoveTag}
    />
  )
}
