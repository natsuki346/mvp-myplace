// 記録系（予定 / 履歴 / カレンダー / デイリー）で共有する定数・型・純関数。
// もとは app/record/page.tsx に定義されていたものを、プロフィール埋め込みと
// 単体表示の両方から使えるように切り出したもの。ロジックは変更していない。

export const GOLD = '#C9A84C'
export const GREEN = '#7BAE7F'
export const RED = '#D98880'
export const CALL_C = '#6C8EBF'
export const CARD_BG = '#FBF7EE'
export const CARD_BORDER = '#E0D5BE'
export const SEGMENT_BG = '#EDE5D0'

export type UserRow = { id: string; username: string; avatar_url: string | null }
export type MsgRow = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  type: string
}

export type Feeling = 'bad' | 'normal' | 'good'
export const FEELING_META: Record<Feeling, { label: string; emoji: string; color: string }> = {
  bad:    { label: 'しんどい', emoji: '😔', color: RED },
  normal: { label: '普通',     emoji: '😐', color: GOLD },
  good:   { label: '良い',     emoji: '😊', color: GREEN },
}
export const FEELING_ORDER: Feeling[] = ['bad', 'normal', 'good']

export type FeelingEntry = { date: string; feeling: Feeling; note?: string }
export type SchedItem = {
  id: string
  partner?: { id?: string; username?: string; avatar_url?: string | null } | null
  partnerTag?: string | null
  date: string
  time: string
  at: number
  method?: string | null
}

export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export function todayKey(): string {
  return dateKey(new Date())
}
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function fmtDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return `${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`
}
export function methodLabel(method?: string | null): string {
  return method === 'call' ? '📞通話'
    : method === 'meet' ? '☕会って話す'
    : method === 'text' ? '💬チャット'
    : '🎥ビデオ通話'
}

// 気持ちログ：localStorage 'feeling_log' = [{date:'YYYY-MM-DD', feeling, note?}]
// 初回は直近4週間分のサンプルを localStorage に一度だけ書き込み、以降は
// ユーザー自身の「今日の記録」がここに積み重なっていく。
export function loadFeelingLog(): FeelingEntry[] {
  try {
    const raw = localStorage.getItem('feeling_log')
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length > 0) return arr
    }
  } catch { /* noop */ }
  // サンプルデータ（直近4週間分）を一度だけ生成して保存
  const sample: FeelingEntry[] = []
  const feelings: Feeling[] = ['bad', 'normal', 'good', 'normal', 'bad', 'good', 'normal', 'bad']
  for (let i = 0; i < 20; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (Math.floor(Math.random() * 26) + 2)) // 今日は空けておく
    sample.push({ date: dateKey(d), feeling: feelings[i % feelings.length] })
  }
  try { localStorage.setItem('feeling_log', JSON.stringify(sample)) } catch { /* noop */ }
  return sample
}

export function saveFeelingLog(log: FeelingEntry[]) {
  try { localStorage.setItem('feeling_log', JSON.stringify(log)) } catch { /* noop */ }
}

// 今日の記録が済んでいるか（ホームの未記録リマインダー判定に使う）。
// 読むだけ（loadFeelingLog はサンプル生成の副作用があるため使わない）。
export function hasTodayFeeling(): boolean {
  try {
    const raw = localStorage.getItem('feeling_log')
    if (!raw) return false
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return false
    return arr.some((f: FeelingEntry) => f?.date === todayKey())
  } catch { return false }
}

// 通話時間（分）… 通話時間の計測は未実装のため、メッセージIDから決定的なモック値を出す
export function mockDuration(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return (Math.abs(h) % 41) + 10 // 10〜50分
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}
export function fmtHM(iso: string): string {
  const d = new Date(iso)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const PERIODS: { key: 'week' | 'month' | '3month'; label: string; days: number }[] = [
  { key: 'week',   label: '1週間', days: 7 },
  { key: 'month',  label: '1ヶ月', days: 30 },
  { key: '3month', label: '3ヶ月', days: 90 },
]

// 記録の単体表示ビュー（/record?view=）
export type RecordViewKey = 'daily' | 'schedule' | 'calendar' | 'history'
export const RECORD_VIEW_META: Record<RecordViewKey, { label: string; heading: string }> = {
  daily:    { label: 'デイリー',   heading: '📝 デイリー' },
  schedule: { label: '予定',       heading: '📅 予定' },
  calendar: { label: 'カレンダー', heading: '🗓 カレンダー' },
  history:  { label: '履歴',       heading: '🎥 履歴' },
}
export function paramToView(v: string | null): RecordViewKey {
  return v === 'daily' || v === 'schedule' || v === 'calendar' || v === 'history' ? v : 'daily'
}

// カレンダーの日ごとの集計データ
export type DayData = { feeling?: Feeling; note?: string; calls: MsgRow[]; scheds: SchedItem[] }
