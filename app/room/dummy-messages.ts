export type DummyMessage = {
  id: string
  mine: boolean
  content: string
}

// チャットの会話例として常に先頭に固定表示するダミーメッセージ
export const DUMMY_MESSAGES: DummyMessage[] = [
  { id: 'dummy-1', mine: false, content: '同じタグを見つけてここに来ました🌱' },
  { id: 'dummy-2', mine: true,  content: 'ようこそ！ここでは名前もアイコンも気にせず話せます' },
  { id: 'dummy-3', mine: false, content: '最近どんな感じで育ててますか？' },
  { id: 'dummy-4', mine: true,  content: 'のんびり、自分のペースで育ててます〜' },
]
