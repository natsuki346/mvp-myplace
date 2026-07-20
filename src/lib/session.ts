// 認証セッション（localStorage）の保存・クリアを一元管理する。
// このアプリは Supabase Auth を使わず、localStorage の user_id でユーザーを識別する。
// ログイン時に user_id/username を保存し、ログアウト時は関連フラグをまとめて消す。
// （onboarded_v2 や selectedMode を消し忘れると、次に別ユーザーがログインしたときに
//  オンボーディングやモード選択が誤ってスキップされるため、必ず一緒にクリアする。）

const AUTH_KEYS = ['user_id', 'username', 'onboarded_v2', 'selectedMode', 'skipModeSelect'] as const

export function saveSession(userId: string, username: string): void {
  localStorage.setItem('user_id', userId)
  localStorage.setItem('username', username)
}

export function clearSession(): void {
  for (const k of AUTH_KEYS) localStorage.removeItem(k)
  // モード選択の再表示判定に使うインメモリのセッションフラグも解除する
  // （app/page.tsx の routeByMode が参照する window.__daimeSession）。
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__daimeSession = undefined
  } catch { /* SSR 等では無視 */ }
}
