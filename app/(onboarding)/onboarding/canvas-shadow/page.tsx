'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CanvasEditor, type TagItem } from '@/src/components/onboarding/CanvasEditor'
import { TutorialPopup } from '@/src/components/onboarding/TutorialPopup'
import { supabase } from '@/src/lib/supabase/client'
import { deactivateTag } from '@/src/lib/supabase/events'

export default function CanvasShadowPage() {
  const router = useRouter()
  const [shadowTags, setShadowTags] = useState<string[]>([])
  const [edited,     setEdited]     = useState(false)

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
    sessionStorage.setItem('shadow_canvas_edited', edited ? 'true' : 'false')
    router.push('/onboarding/canvas-shadow/title')
  }

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
    <>
      <TutorialPopup variant="shadow" />
      <CanvasEditor
        variant="shadow"
        title="根のキャンバス"
        icon="🌙"
        initialTags={shadowTags}
        onComplete={proceed}
        onSkip={() => proceed()}
        onRemoveTag={handleRemoveTag}
        onEdit={() => setEdited(true)}
      />
    </>
  )
}
