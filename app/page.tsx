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
    // ・完全に再起動した（新セッション = __daimeSession 未設定）
    // ・かつ「今日はこれ以降表示しない」を今日はチェックしていない
    // （未選択なら初回として必ず表示）
    // sessionStorage は Capacitor WKWebView でバックグラウンドから復帰時にも
    // 保持されてしまうことがあるため、インメモリ変数を使う。
    // インメモリ変数は WKWebView の JS コンテキスト生成時（コールドスタート）に
    // 必ずリセットされる。
    const today = new Date().toDateString()
    const skipToday = localStorage.getItem('skipModeSelect')
    const sessionActive = (window as any).__daimeSession as boolean | undefined
    ;(window as any).__daimeSession = true
    const selectedMode = localStorage.getItem('selectedMode')
    const needMode = !selectedMode || (!sessionActive && skipToday !== today)

    router.push(needMode ? '/mode' : '/home/feed')
  }, [router])

  return null
}
