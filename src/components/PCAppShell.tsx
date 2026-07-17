'use client'

import { usePathname } from 'next/navigation'
import { ProfileDrawer } from '@/src/components/ProfileDrawer'

// PC（md以上）かつ主要アプリ画面（ホーム / チャット / 記録）で左サイドバーを表示し、
// 中央を main とするシェル。右サイドバーは常設せず、チャット画面（RoomTabsPage /
// フレンドチャット）が必要なときだけ動的に描画する（PCRightSidebar）。
// それ以外のページ（welcome / onboarding / profile 等）やスマホでは
// 従来どおり children をそのまま全幅で表示する（サイドバーは hidden md:flex）。

// プロフィールも左サイドバー付きで表示する（サイドバーのアバター/プロフィールボタンから
// 遷移してもサイドバーが消えないように）。
const MAIN_PREFIXES = ['/home', '/room', '/record', '/profile']

export default function PCAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMain = MAIN_PREFIXES.some(p => pathname.startsWith(p))

  if (!isMain) return <main>{children}</main>

  // プロフィールはサイドバーを残しつつ、中身を「画面全体の中央」に置きたい。
  // 左サイドバー(240px)と同じ幅のスペーサーを右に足して main を左右対称にすることで、
  // margin:0 auto の中身がビューポート中央にそろう（左に寄らない）。
  const isProfile = pathname.startsWith('/profile')

  return (
    <div className="md:flex md:items-start">
      <ProfileDrawer isInline />
      <main className="md:flex-1 md:min-w-0">{children}</main>
      {isProfile && <div className="hidden md:block w-[240px] shrink-0" aria-hidden />}
    </div>
  )
}
