// モックユーザー「Yuki」— Privateタブ・チャットのデモ表示用。
// Yuki は実ユーザー（friend_messages / video-room が実際に動くよう実IDを持つ）。
// 下記のメッセージ履歴・カードは「表示専用のモック」で、実データではない。
// 実際に送ったメッセージ・🎥/📅で作られたカードは、この履歴の下に追記される。

export const YUKI_ID = 'a1b2c3d4-0000-4000-8000-000000000001'
export const YUKI_NAME = 'Yuki'
export const YUKI_TAG = 'うつ経験'

type DateMatch = { text: string; date: string; time: string }

type RawMock = {
  id: string
  fromMe: boolean
  content: string
  minutesAgo: number
  // 日付表現を含む場合、その抽出結果（青文字リンク＋予定登録の対象）
  dates?: (tomorrow: string) => DateMatch[]
}

// 送信・受信を含むチャット履歴のモック（日付表現つき2件は青文字リンクになる）
const RAW: RawMock[] = [
  { id: 'mock-1', fromMe: false, minutesAgo: 10, content: 'こんにちは。少し話を聞いてもらえますか？' },
  { id: 'mock-2', fromMe: true,  minutesAgo: 9,  content: 'もちろんです。ゆっくりで大丈夫ですよ。' },
  {
    id: 'mock-3', fromMe: false, minutesAgo: 8,
    content: '最近、朝起きるのがつらくて…。明日の21時からお話できますか？',
    dates: (tomorrow) => [{ text: '明日の21時', date: tomorrow, time: '21:00' }],
  },
  {
    id: 'mock-4', fromMe: true, minutesAgo: 7,
    content: '大丈夫です。明日の21時に話しましょう。',
    dates: (tomorrow) => [{ text: '明日の21時', date: tomorrow, time: '21:00' }],
  },
]

// created_at を現在時刻から逆算して、通常メッセージと同じ型で返す
export function buildYukiMockMessages(myUserId: string) {
  const now = Date.now()
  const t = new Date(now + 24 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const tomorrow = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`

  return RAW.map(m => ({
    id: m.id,
    sender_id: m.fromMe ? myUserId : YUKI_ID,
    receiver_id: m.fromMe ? YUKI_ID : myUserId,
    content: m.content,
    created_at: new Date(now - m.minutesAgo * 60 * 1000).toISOString(),
    type: 'text' as const,
    metadata: m.dates ? { dates: m.dates(tomorrow) } : null,
    sender: m.fromMe
      ? null
      : { id: YUKI_ID, username: YUKI_NAME, avatar_url: null },
  }))
}

// Privateタブ一覧に出す最後のメッセージのプレビュー
export const YUKI_LAST_PREVIEW = '大丈夫です。明日の21時に話しましょう。'
