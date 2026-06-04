'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CanvasEditor, type TagItem } from '@/src/components/onboarding/CanvasEditor'

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

  return (
    <CanvasEditor
      variant="light"
      title="光キャンバス"
      icon="☀️"
      initialTags={lightTags}
      onComplete={proceed}
      onSkip={() => proceed()}
    />
  )
}
