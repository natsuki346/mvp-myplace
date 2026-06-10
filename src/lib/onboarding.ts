// 部屋訪問オンボーディング（誘導〜完了モーダル）の完了状態を、ユーザーごとに管理する。
// 同一ブラウザで複数アカウントを試す場合でも、ユーザーが切り替わったら再度表示されるようにする。

function roomOnboardingDoneKey(): string {
  const userId = typeof window !== 'undefined' ? window.sessionStorage.getItem('user_id') : null
  return `canvas:roomOnboardingDone:${userId ?? 'anon'}`
}

export function isRoomOnboardingDone(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(roomOnboardingDoneKey()) === 'true'
}

export function markRoomOnboardingDone(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(roomOnboardingDoneKey(), 'true')
}
