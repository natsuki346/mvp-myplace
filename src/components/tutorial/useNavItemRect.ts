'use client'

import { useEffect, useState } from 'react'

export type NavItemRect = { left: number; top: number; width: number; height: number }

// BottomNav の data-nav-id を持つ実DOM要素の位置を取得する。
// セーフエリア対応等でBottomNavの実際の高さ・位置が変わっても、矢印/ハイライトの
// 案内演出が固定px値でズレないように、常に実測値を使う。
export function useNavItemRect(navId: string): NavItemRect | null {
  const [rect, setRect] = useState<NavItemRect | null>(null)

  useEffect(() => {
    const measure = () => {
      const el = document.querySelector(`[data-nav-id="${navId}"]`)
      if (!el) return
      const r = el.getBoundingClientRect()
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [navId])

  return rect
}
