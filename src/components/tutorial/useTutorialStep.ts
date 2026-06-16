'use client'

import { useCallback, useSyncExternalStore } from 'react'

export type TutorialStep =
  | 'room_nav_arrow'   // ① ルームへの矢印ガイド
  | 'room_intro'       // ④ ルームってなに？説明モーダル
  | 'room_explain_mi'  // ⑤ 実の部屋の説明モーダル
  | 'room_chat_mi'     // ⑥ 実の部屋チャット（閲覧モード）
  | 'room_grow_animation' // ⑥.5 成長アニメーション3（芽→つぼみ）
  | 'ne_room_popup'    // ⑦ 根の部屋ものぞきますか？ポップアップ
  | 'room_explain_ne'  // ⑧ 根の部屋の説明モーダル
  | 'room_chat_ne'     // ⑨ 根の部屋チャット（閲覧モード）
  | 'watering'         // ⑩ 水やり演出
  | 'growth_result'    // ⑩.5 「成長した！向き合えた！」モーダル
  | 'growth_explain'   // ⑩.7 成長の仕組み説明（ヘルプ画面）
  | 'growth_modal'     // ⑪ 「向き合えてえらい！」モーダル
  | 'thankyou_modal'   // ⑫ 「協力ありがとう」モーダル
  | 'done'             // ⑬ 完了

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
