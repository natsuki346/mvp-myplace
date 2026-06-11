export type DummyMessage = {
  id: string
  mine: boolean
  content: string
}

// 実の部屋チャットの会話例として常に先頭に固定表示するダミーメッセージ
export const DUMMY_MESSAGES_LIGHT: DummyMessage[] = [
  { id: 'dummy-light-1', mine: false, content: '同じ実を持つ人を見つけました🍅' },
  { id: 'dummy-light-2', mine: true,  content: 'わ、嬉しいです！ここでは名前もアイコンも気にせず話せます' },
  { id: 'dummy-light-3', mine: false, content: '最近ちょっとずつ続けられてることがあって' },
  { id: 'dummy-light-4', mine: true,  content: 'いいですね、私もそういう実を育ててみたいです' },
  { id: 'dummy-light-5', mine: false, content: '一緒に育てていけたら嬉しいです' },
]

// 根の部屋チャットの会話例として常に先頭に固定表示するダミーメッセージ
export const DUMMY_MESSAGES_SHADOW: DummyMessage[] = [
  { id: 'dummy-shadow-1', mine: false, content: '同じタグを見つけてここに来ました🌱' },
  { id: 'dummy-shadow-2', mine: true,  content: 'ようこそ。ここでは名前もアイコンも気にせず話せます' },
  { id: 'dummy-shadow-3', mine: false, content: '最近、少し疲れてしまって' },
  { id: 'dummy-shadow-4', mine: true,  content: 'そういう時もありますよね。無理しないでくださいね' },
  { id: 'dummy-shadow-5', mine: false, content: 'ありがとうございます。少し気が楽になりました' },
]

export const DUMMY_MESSAGES: Record<'light' | 'shadow', DummyMessage[]> = {
  light: DUMMY_MESSAGES_LIGHT,
  shadow: DUMMY_MESSAGES_SHADOW,
}
