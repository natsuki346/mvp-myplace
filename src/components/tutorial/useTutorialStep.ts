'use client'

import { useCallback, useSyncExternalStore } from 'react'

export type TutorialStep =
  | 'process_mapping'  // ① プロセスマッピング
  | 'step_cards'       // ② STEPカード群
  | 'mi_room_popup'    // ④ 実の部屋訪問ポップアップ
  | 'mi_room_explore'  // ⑤ 実の部屋体験中
  | 'ne_room_popup'    // ⑥ 根の部屋訪問ポップアップ
  | 'ne_room_explore'  // ⑦ 根の部屋体験中
  | 'completion_modal' // ⑧ 完了モーダル
  | 'room_nav_arrow'   // ⑨ 矢印ガイド
  | 'room_explain'        // ルームの仕組み説明（実の部屋）
  | 'room_chat_light'     // チャット体験（実の部屋）
  | 'room_explain_shadow' // ルームの仕組み説明（根の部屋）
  | 'room_chat'           // チャット体験（根の部屋）
  | 'watering'            // 水やり演出
  | 'done'             // 完了

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
