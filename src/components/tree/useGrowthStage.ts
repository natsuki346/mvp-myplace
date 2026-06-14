'use client'

import { useCallback, useSyncExternalStore } from 'react'

export type GrowthStage =
  | 'seed'    // タネ（初期）
  | 'sprout'  // 芽（Q1〜4回答後）
  | 'bud'     // 小さな芽（デコレーション後）
  | 'budding' // つぼみ（実の部屋訪問後）
  | 'bloom'   // 開花＋花火（根の部屋体験完了後）

export const GROWTH_STAGE_LABELS: Record<GrowthStage, string> = {
  seed: 'タネ',
  sprout: '芽',
  bud: '芽',
  budding: 'つぼみ',
  bloom: '満開',
}

const STORAGE_KEY = 'seedme_growth_stage'

const listeners = new Set<() => void>()

function subscribe(callback: () => void) {
  listeners.add(callback)
  window.addEventListener('storage', callback)
  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', callback)
  }
}

function getSnapshot(): GrowthStage {
  return (window.localStorage.getItem(STORAGE_KEY) as GrowthStage | null) ?? 'seed'
}

function getServerSnapshot(): GrowthStage {
  return 'seed'
}

export function useGrowthStage() {
  const stage = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setGrowthStage = useCallback((next: GrowthStage) => {
    window.localStorage.setItem(STORAGE_KEY, next)
    listeners.forEach(l => l())
  }, [])

  return { stage, setGrowthStage }
}
