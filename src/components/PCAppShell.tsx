'use client'

import { usePathname } from 'next/navigation'
import { ProfileDrawer } from '@/src/components/ProfileDrawer'

// PC（md以上）かつ主要アプリ画面（ホーム / チャット / 記録）で左サイドバーを表示し、
// 中央を main とするシェル。右サイドバーは常設せず、チャット画面（RoomTabsPage /
// フレンドチャット）が必要なときだけ動的に描画する（PCRightSidebar）。
// それ以外のページ（welcome / onboarding / profile 等）やスマホでは
// 従来どおり children をそのまま全幅で表示する（サイドバーは hidden md:flex）。

const MAIN_PREFIXES = ['/home', '/room', '/record']

export default function PCAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMain = MAIN_PREFIXES.some(p => pathname.startsWith(p))

  if (!isMain) return <main>{children}</main>

  return (
    <div className="md:flex md:items-start">
      <ProfileDrawer isInline />
      <main className="md:flex-1 md:min-w-0">{children}</main>
    </div>
  )
}
