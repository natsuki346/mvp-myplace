'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    if (!userId) {
      router.push('/username')
      return
    }

    // ── オンボーディング完了判定 ──────────────────────────────
    // 主にクライアント側の localStorage フラグで判定する（onboarded_at 列が
    // まだ無い環境でも動く）。フラグが無ければ DB の onboarded_at を保険で確認し、
    // どちらも未完了なら /welcome（＝オンボーディング）へ誘導する。
    // 既存ユーザーはフラグも onboarded_at も無いため、自動的に初期登録へ戻る。
    const gateThenRoute = async () => {
      if (localStorage.getItem('onboarded_v2') !== 'true') {
        let onboarded = false
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data } = await (supabase.from('users') as any)
            .select('onboarded_at')
            .eq('id', userId)
            .maybeSingle()
          onboarded = !!data?.onboarded_at
        } catch { /* 列が無い等は未完了扱い */ }

        if (!onboarded) {
          router.replace('/welcome')
          return
        }
        localStorage.setItem('onboarded_v2', 'true')
      }
      routeByMode()
    }

    // モード選択を出す条件：
    // ・完全に再起動した（新セッション = __daimeSession 未設定）
    // ・かつ「今日はこれ以降表示しない」を今日はチェックしていない
    // （未選択なら初回として必ず表示）
    // sessionStorage は Capacitor WKWebView でバックグラウンドから復帰時にも
    // 保持されてしまうことがあるため、インメモリ変数を使う。
    // インメモリ変数は WKWebView の JS コンテキスト生成時（コールドスタート）に
    // 必ずリセットされる。
    const routeByMode = () => {
      const today = new Date().toDateString()
      const skipToday = localStorage.getItem('skipModeSelect')
      const sessionActive = (window as any).__daimeSession as boolean | undefined
      ;(window as any).__daimeSession = true
      const selectedMode = localStorage.getItem('selectedMode')
      const needMode = !selectedMode || (!sessionActive && skipToday !== today)

      router.replace(needMode ? '/mode' : '/home/feed')
    }

    void gateThenRoute()
  }, [router])

  return null
}
