'use client'

import { useState } from 'react'

export type TutorialStep =
  | 'point_room_nav'
  | 'explain_mi_room'
  | 'explain_ne_room'
  | 'done'

const STORAGE_KEY = 'whyme_tutorial_step'

const VALID_STEPS: TutorialStep[] = ['point_room_nav', 'explain_mi_room', 'explain_ne_room', 'done']

function readStep(): TutorialStep {
  if (typeof window === 'undefined') return 'point_room_nav'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  return (VALID_STEPS as string[]).includes(saved ?? '') ? (saved as TutorialStep) : 'point_room_nav'
}

export function useTutorial() {
  const [step, setStep] = useState<TutorialStep>(readStep)

  const advanceStep = (next: TutorialStep) => {
    setStep(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
  }

  return { step, advanceStep }
}
