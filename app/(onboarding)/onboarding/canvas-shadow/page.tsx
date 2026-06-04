'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CanvasEditor, type TagItem } from '@/src/components/onboarding/CanvasEditor'

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

  return (
    <CanvasEditor
      variant="shadow"
      title="影キャンバス"
      icon="🌙"
      initialTags={shadowTags}
      onComplete={proceed}
      onSkip={() => proceed()}
    />
  )
}
