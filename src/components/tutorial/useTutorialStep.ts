'use client'

import { useCallback, useSyncExternalStore } from 'react'

export type TutorialStep =
  | 'process_mapping'  // ① プロセスマッピング
  | 'step_cards'       // ② STEPカード群
  | 'room_nav_arrow'   // ③ ルームへの矢印ガイド
  | 'room_intro'       // ④ ルームってなに？説明モーダル
  | 'room_explain_mi'  // ⑤ 実の部屋の説明モーダル
  | 'room_chat_mi'     // ⑥ 実の部屋チャット（閲覧モード）
  | 'ne_room_popup'    // ⑦ 根の部屋ものぞきますか？ポップアップ
  | 'room_explain_ne'  // ⑧ 根の部屋の説明モーダル
  | 'room_chat_ne'     // ⑨ 根の部屋チャット（閲覧モード）
  | 'watering'         // ⑩ 水やり演出
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

function getSnapshot(): TutorialStep {
  return (window.localStorage.getItem(STORAGE_KEY) as TutorialStep | null) ?? 'done'
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
