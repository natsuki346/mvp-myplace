'use client'

import { useRouter, usePathname } from 'next/navigation'
import DaisyFlower from '@/src/components/DaisyFlower'

// PC（md以上）専用の上部ナビバー。スマホでは BottomNav（md:hidden）を使う。
// app/layout.tsx から全ページ共通で表示される。
// アカウントへの導線は左サイドバー下部のアバター（ProfileDrawer inline）に集約。

const NAV_ITEMS = [
  { id: 'feed',   label: 'ホーム',   path: '/home/feed' },
  { id: 'room',   label: 'チャット', path: '/room/light' },
  { id: 'record', label: '記録',     path: '/record' },
]

export default function PCNav() {
  const router   = useRouter()
  const pathname = usePathname()

  return (
    <nav className="hidden md:flex sticky top-0 z-[150] h-14 items-center px-6 bg-[#F5F0E8] border-b border-[rgba(139,115,85,0.2)]">
      {/* 左：ロゴ（welcome画面と同じデイジー＋「DaiMe」） */}
      <button
        onClick={() => router.push('/home/feed')}
        className="flex items-center gap-2 bg-transparent border-none cursor-pointer"
      >
        <DaisyFlower size={26} animate />
        <span className="text-base font-bold text-[#3B2F1E] tracking-wide">DaiMe</span>
      </button>

      {/* 中央：タブ（サイドバーを無視して画面全体の中央に絶対配置） */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        {NAV_ITEMS.map(item => {
          const active = item.path === '/room/light'
            ? pathname.startsWith('/room')
            : pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`px-5 py-1.5 rounded-full text-sm border-none cursor-pointer transition-colors ${
                active
                  ? 'bg-[#EDE5D0] text-[#4A7C59] font-bold'
                  : 'bg-transparent text-[#A89880] font-medium hover:text-[#3B2F1E]'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
