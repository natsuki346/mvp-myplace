'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CanvasEditor, type TagItem } from '@/src/components/onboarding/CanvasEditor'
import { TutorialPopup } from '@/src/components/onboarding/TutorialPopup'
import { supabase } from '@/src/lib/supabase/client'
import { deactivateTag } from '@/src/lib/supabase/events'

export default function CanvasLightPage() {
  const router = useRouter()
  const [lightTags, setLightTags] = useState<string[]>([])
  const [edited,    setEdited]    = useState(false)

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
    // 編集有無を sessionStorage に保存
    sessionStorage.setItem('light_canvas_edited', edited ? 'true' : 'false')
    router.push('/onboarding/canvas-light/title')
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
      <TutorialPopup variant="light" />
      <CanvasEditor
        variant="light"
        title="実のキャンバス"
        icon="☀️"
        initialTags={lightTags}
        onComplete={proceed}
        onSkip={() => proceed()}
        onRemoveTag={handleRemoveTag}
        onEdit={() => setEdited(true)}
      />
    </>
  )
}
