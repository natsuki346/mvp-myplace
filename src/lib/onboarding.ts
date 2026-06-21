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

// バブル詳細モーダルの案内ツールチップ（「保存した言葉」「メモ・ジャーナル」を指し示すもの）を
// 既に見たかどうか。ユーザーごとに、初回表示の1回限りで案内する。
function bubbleDetailTooltipSeenKey(): string {
  const userId = typeof window !== 'undefined' ? window.sessionStorage.getItem('user_id') : null
  return `canvas:bubbleDetailTooltipSeen:${userId ?? 'anon'}`
}

export function isBubbleDetailTooltipSeen(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(bubbleDetailTooltipSeenKey()) === 'true'
}

export function markBubbleDetailTooltipSeen(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(bubbleDetailTooltipSeenKey(), 'true')
}

// チャットの保存（ブックマーク）ボタンの案内バナーを既に見たかどうか。
// ユーザーごとに、初めてチャットを開いた時の1回限りで案内する。
// ※ キーに :v4 を付けているのは、過去バージョン（位置がズレていた／非表示になっていた版）
// のテスト中に誤って既読化されてしまった既存ユーザーにも、直った状態でもう一度案内が
// 出るようにするため。
function saveTooltipSeenKey(): string {
  const userId = typeof window !== 'undefined' ? window.sessionStorage.getItem('user_id') : null
  return `canvas:saveTooltipSeen:v4:${userId ?? 'anon'}`
}

export function isSaveTooltipSeen(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(saveTooltipSeenKey()) === 'true'
}

export function markSaveTooltipSeen(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(saveTooltipSeenKey(), 'true')
}
