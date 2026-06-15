export type DummyMessage = {
  id: string
  mine: boolean
  content: string
  isSystem?: boolean
}

// 実の部屋チャットの会話例として常に先頭に固定表示するダミーメッセージ
export const DUMMY_MESSAGES_LIGHT: DummyMessage[] = [
  { id: 'dummy-light-1', mine: false, content: '同じ実を持つ人を見つけました🍅', isSystem: true },
  { id: 'dummy-light-2', mine: true,  content: 'わ、嬉しいです！ここでは名前もアイコンも気にせず話せます' },
  { id: 'dummy-light-3', mine: false, content: '最近ちょっとずつ続けられてることがあって' },
  { id: 'dummy-light-4', mine: true,  content: 'いいですね、私もそういう実を育ててみたいです' },
  { id: 'dummy-light-5', mine: false, content: '一緒に育てていけたら嬉しいです' },
]

// 根の部屋チャットの会話例として常に先頭に固定表示するダミーメッセージ
export const DUMMY_MESSAGES_SHADOW: DummyMessage[] = [
  { id: 'dummy-shadow-1', mine: false, content: '同じタグを見つけてここに来ました🌱', isSystem: true },
  { id: 'dummy-shadow-2', mine: true,  content: 'ようこそ。ここでは名前もアイコンも気にせず話せます' },
  { id: 'dummy-shadow-3', mine: false, content: '最近、少し疲れてしまって' },
  { id: 'dummy-shadow-4', mine: true,  content: 'そういう時もありますよね。無理しないでくださいね' },
  { id: 'dummy-shadow-5', mine: false, content: 'ありがとうございます。少し気が楽になりました' },
]

export const DUMMY_MESSAGES: Record<'light' | 'shadow', DummyMessage[]> = {
  light: DUMMY_MESSAGES_LIGHT,
  shadow: DUMMY_MESSAGES_SHADOW,
}

// 閲覧モード（room_chat_mi / room_chat_ne）用：自分は登場せず、他ユーザー同士の会話例
export const DUMMY_MESSAGES_VIEWONLY_LIGHT: DummyMessage[] = [
  { id: 'viewonly-light-1', mine: false, content: '最近、小さいことだけど続けられてることがあって' },
  { id: 'viewonly-light-2', mine: false, content: 'わかります、続けるのって本当にすごいことですよね' },
  { id: 'viewonly-light-3', mine: false, content: '同じタグの人がいるって知れて、なんだか嬉しいです' },
  { id: 'viewonly-light-4', mine: false, content: '私もです。一人じゃないって思えると頑張れます' },
]

export const DUMMY_MESSAGES_VIEWONLY_SHADOW: DummyMessage[] = [
  { id: 'viewonly-shadow-1', mine: false, content: '最近、自分がここにいる意味がわからなくて' },
  { id: 'viewonly-shadow-2', mine: false, content: 'わかる。毎日同じことの繰り返しで、何のためにって思う' },
  { id: 'viewonly-shadow-3', mine: false, content: 'でもこうして同じ気持ちの人がいるってわかるだけで少し楽になる' },
  { id: 'viewonly-shadow-4', mine: false, content: 'うん、ひとりじゃないって感じがする' },
]

export const DUMMY_MESSAGES_VIEWONLY: Record<'light' | 'shadow', DummyMessage[]> = {
  light: DUMMY_MESSAGES_VIEWONLY_LIGHT,
  shadow: DUMMY_MESSAGES_VIEWONLY_SHADOW,
}
