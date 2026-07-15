// ビデオ通話（Daily.co）・記録AI分析の Edge Function クライアント
const VIDEO_ROOM_EDGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/video-room`
const EDGE_AUTH_HEADERS = {
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
}

const BOOKINGS_EDGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/bookings`
const DETECT_DATES_EDGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/detect-dates`

// チャット相手とのルームID（常に同じペアは同じIDになる）
export function pairRoomId(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join('-')
}

export type DateMatch = { text: string; date: string; time: string }

// 日時表現をざっくり含みそうか（Edge Function呼び出しを間引く前フィルタ）
export function mayContainDate(text: string): boolean {
  return /(\d|今日|明日|明後日|あさって|今夜|今晩|来週|再来週|来月|月曜|火曜|水曜|木曜|金曜|土曜|日曜|時|分|:|：)/.test(text)
}

// メッセージ本文から日時表現を抽出（detect-dates Edge Function）
export async function detectDates(userId: string, text: string): Promise<DateMatch[]> {
  const res = await fetch(DETECT_DATES_EDGE_URL, {
    method: 'POST',
    headers: { ...EDGE_AUTH_HEADERS, 'x-user-id': userId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) return []
  const { matches } = await res.json()
  return Array.isArray(matches) ? matches : []
}

// 日時直指定の予約を作成（相手=partnerId、自分=guest、status='scheduled'）
export async function scheduleBooking(
  userId: string, partnerId: string, date: string, time: string, method: string,
): Promise<boolean> {
  const res = await fetch(`${BOOKINGS_EDGE_URL}/schedule`, {
    method: 'POST',
    headers: { ...EDGE_AUTH_HEADERS, 'x-user-id': userId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ partner_id: partnerId, date, time, method }),
  })
  return res.ok
}

// Daily.co のルームを作成（既存があれば再利用）して URL を返す
export async function createVideoRoom(userId: string, partnerId: string): Promise<string | null> {
  const res = await fetch(VIDEO_ROOM_EDGE_URL, {
    method: 'POST',
    headers: { ...EDGE_AUTH_HEADERS, 'x-user-id': userId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ room_id: pairRoomId(userId, partnerId) }),
  })
  if (!res.ok) return null
  const { url } = await res.json()
  return url ?? null
}

// 話した記録からパターンinsightを生成
export async function fetchInsight(userId: string, records: unknown): Promise<string | null> {
  const res = await fetch(`${VIDEO_ROOM_EDGE_URL}/insight`, {
    method: 'POST',
    headers: { ...EDGE_AUTH_HEADERS, 'x-user-id': userId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  })
  if (!res.ok) return null
  const { insight } = await res.json()
  return insight || null
}

export type ReportSection = { title: string; body: string }

// 期間レポート：指定期間の記録から振り返りレポート（複数セクション）を生成する
export async function fetchReport(userId: string, records: unknown): Promise<ReportSection[] | null> {
  const res = await fetch(`${VIDEO_ROOM_EDGE_URL}/report`, {
    method: 'POST',
    headers: { ...EDGE_AUTH_HEADERS, 'x-user-id': userId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  })
  if (!res.ok) return null
  const { sections } = await res.json()
  return Array.isArray(sections) ? sections : null
}

// Capacitorのグローバル（ネイティブで自動登録される）から Browser プラグインを使う。
// @capacitor/browser をJSでimportしないことで、Web書き出しビルドの依存解決を避ける。
type CapacitorGlobal = {
  isNativePlatform?: () => boolean
  Plugins?: { Browser?: { open?: (opts: { url: string }) => Promise<void> } }
}

// 外部URLを開く（ネイティブは Capacitor Browser、Webは新規タブ）
export async function openUrl(url: string): Promise<void> {
  try {
    const cap = typeof window !== 'undefined'
      ? (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor
      : undefined
    if (cap?.isNativePlatform?.() && cap.Plugins?.Browser?.open) {
      await cap.Plugins.Browser.open({ url })
      return
    }
  } catch {
    // ネイティブで開けない場合はWebのフォールバックへ
  }
  window.open(url, '_blank')
}

// URLの短縮表示（https://xxx.daily.co/daime-abc → daily.co/daime-abc）
export function shortRoomUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.hostname.replace(/^.*\.(daily\.co)$/, '$1')}${u.pathname}`
  } catch {
    return url
  }
}

// video_scheduled メッセージの content（JSON）を安全にパースする
export type ScheduledPayload = { date: string; time: string }
export function parseScheduled(content: string): ScheduledPayload | null {
  try {
    const p = JSON.parse(content)
    if (typeof p?.date === 'string' && typeof p?.time === 'string') return p
  } catch { /* noop */ }
  return null
}
