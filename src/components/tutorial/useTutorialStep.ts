'use client'

import { useCallback, useSyncExternalStore } from 'react'

export type TutorialStep =
  | 'room_nav_arrow'   // ① ルームへの矢印ガイド
  | 'room_intro'       // ④ ルームってなに？説明モーダル
  | 'room_chat_mi'     // ⑤ 実の部屋チャット
  | 'room_grow_animation' // ⑥.5 成長アニメーション3（芽→つぼみ）
  | 'ne_room_popup'         // ⑦ Seedルーム訪問の分岐点（常にスキップし room_grow_animation へ自動遷移）
  | 'room_chat_ne'          // ⑧ 根の部屋チャット
  | 'garden_onboarding'     // ⑧.5 ガーデン案内モーダル（ガーデン説明スライド→③チェック→名言→歓迎モーダル）
  | 'completed'        // ⑨ オンボーディング全体完了（歓迎モーダルを閉じた時点で確定。再表示しない）

const STORAGE_KEY = 'whyme_tutorial_step'

const listeners = new Set<() => void>()

function subscribe(callback: () => void) {
  listeners.add(callback)
  window.addEventListener('storage', callback)
  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', callback)
  }
}

const OBSOLETE_STEPS = new Set(['process_mapping', 'step_cards'])

function getSnapshot(): TutorialStep {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored || OBSOLETE_STEPS.has(stored)) return 'room_nav_arrow'
  return stored as TutorialStep
}

function getServerSnapshot(): TutorialStep | null {
  return null
}

export function useTutorialStep() {
  const step = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const advanceStep = useCallback((next: TutorialStep) => {
    window.localStorage.setItem(STORAGE_KEY, next)
    listeners.forEach(l => l())
  }, [])

  return { step, advanceStep }
}
