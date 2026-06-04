'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CanvasEditor, type TagItem } from '@/src/components/onboarding/CanvasEditor'
import { supabase } from '@/src/lib/supabase/client'
import { deactivateTag } from '@/src/lib/supabase/events'

export default function CanvasLightPage() {
  const router = useRouter()
  const [lightTags, setLightTags] = useState<string[]>([])

  useEffect(() => {
    const raw = sessionStorage.getItem('onboarding_tags')
    if (!raw) return
    const { lightTags: l } = JSON.parse(raw) as { lightTags: string[] }
    setLightTags(l ?? [])
  }, [])

  const proceed = (items?: TagItem[]) => {
    if (items) {
      const raw     = sessionStorage.getItem('onboarding_tags')
      const current = raw ? JSON.parse(raw) : {}
      sessionStorage.setItem('onboarding_tags', JSON.stringify({ ...current, lightItems: items }))
    }
    router.push('/onboarding/canvas-shadow')
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
      variant="light"
      title="光キャンバス"
      icon="☀️"
      initialTags={lightTags}
      onComplete={proceed}
      onSkip={() => proceed()}
      onRemoveTag={handleRemoveTag}
    />
  )
}
