'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    if (!userId) {
      router.push('/username')
      return
    }

    // モード選択を出す条件：
    // ・完全に再起動した（新セッション = sessionActive 未設定）
    // ・かつ「今日はこれ以降表示しない」を今日はチェックしていない
    // （未選択なら初回として必ず表示）
    const today = new Date().toDateString()
    const skipToday = localStorage.getItem('skipModeSelect')
    const sessionActive = sessionStorage.getItem('sessionActive')
    const selectedMode = localStorage.getItem('selectedMode')
    const needMode = !selectedMode || (!sessionActive && skipToday !== today)

    // セッション開始を記録（同一セッション中＝バックグラウンド復帰では再表示しない）
    sessionStorage.setItem('sessionActive', 'true')

    router.push(needMode ? '/mode' : '/home/feed')
  }, [router])

  return null
}
