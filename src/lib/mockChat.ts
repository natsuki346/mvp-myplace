// モックチャット store（実在しない mock-* ユーザーとの一気通貫デモ用）。
//
// あおい/けんた（Rescue）や さくら/ゆうき（Talk me）のような偽ID（mock-*）は
// friend_messages / users に実在しないため Supabase を使えない。そこでスレッドを
// localStorage に保持し、送受信・自動返信をクライアント側だけで完結させる。
// 実ユーザー（UUID）とのチャットは従来どおり Supabase を使うので、ここは通らない。
//
// 動作確認用。USE_MOCK_* を false にする／このファイルを消せば本番導線には影響しない。

export type MockChatMessage = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  type: 'text'
}

export type MockThread = {
  friendId: string
  name: string
  tag: string
  avatarUrl: string | null
  // 相手（mock-*）が自動返信するときの定型文（発言のたびに順番に使う）
  replies: string[]
  messages: MockChatMessage[]
  updatedAt: string
}

const KEY = 'daime_mock_threads_v1'

// 既定の自動返信（呼び出し側が replies を渡さなかったときのフォールバック）
const DEFAULT_REPLIES = [
  'ありがとうございます。少し安心しました。',
  'そう言ってもらえて嬉しいです。',
  '聞いてもらえるだけで、気持ちが軽くなります。',
]

export function isMockId(id: string | null | undefined): boolean {
  return !!id && id.startsWith('mock-')
}

function readAll(): Record<string, MockThread> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '{}') as Record<string, MockThread>
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, MockThread>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, JSON.stringify(all))
  // チャット一覧など別画面が更新に気付けるよう通知
  window.dispatchEvent(new Event('mockchat-updated'))
}

const newId = (): string => `mock-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export function getThread(friendId: string): MockThread | null {
  return readAll()[friendId] ?? null
}

export function listThreads(): MockThread[] {
  return Object.values(readAll()).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

// スレッドが無ければ作る。あれば既存を返す（名前/タグ/返信文だけ最新化）。冪等。
export function ensureThread(input: {
  friendId: string
  name: string
  tag: string
  avatarUrl?: string | null
  replies?: string[]
}): MockThread {
  const all = readAll()
  const existing = all[input.friendId]
  if (existing) {
    existing.name = input.name || existing.name
    existing.tag = input.tag || existing.tag
    if (input.avatarUrl !== undefined) existing.avatarUrl = input.avatarUrl
    if (input.replies && input.replies.length > 0) existing.replies = input.replies
    all[input.friendId] = existing
    writeAll(all)
    return existing
  }
  const thread: MockThread = {
    friendId: input.friendId,
    name: input.name,
    tag: input.tag,
    avatarUrl: input.avatarUrl ?? null,
    replies: input.replies && input.replies.length > 0 ? input.replies : DEFAULT_REPLIES,
    messages: [],
    updatedAt: new Date().toISOString(),
  }
  all[input.friendId] = thread
  writeAll(all)
  return thread
}

// スレッドにメッセージを1件追加する（送信者は自分でも相手でも可）。
export function addMessage(
  friendId: string,
  senderId: string,
  receiverId: string,
  content: string,
): MockChatMessage | null {
  const text = content.trim()
  if (!text) return null
  const all = readAll()
  const thread = all[friendId]
  if (!thread) return null
  const msg: MockChatMessage = {
    id: newId(),
    sender_id: senderId,
    receiver_id: receiverId,
    content: text,
    created_at: new Date().toISOString(),
    type: 'text',
  }
  thread.messages.push(msg)
  thread.updatedAt = msg.created_at
  all[friendId] = thread
  writeAll(all)
  return msg
}

// 指定のメッセージ群を「まだ無ければ」スレッドに差し込む（id で重複判定）。冪等。
// created_at で時系列に整列し直すので、過去寄りのタイムスタンプを与えれば先頭に入る。
// Come on の承認直後メッセージ（HELP側の依頼＋Rescue側の承諾）を、
// 既存/再訪に関わらず決まった順序で確実に表示するために使う。
export function seedMessages(
  friendId: string,
  seeds: { id: string; sender_id: string; receiver_id: string; content: string; created_at: string }[],
): void {
  const all = readAll()
  const thread = all[friendId]
  if (!thread) return
  let changed = false
  for (const s of seeds) {
    // id が既にあればスキップ（再訪しても二重に入らない）
    if (thread.messages.some(m => m.id === s.id)) continue
    thread.messages.push({ ...s, type: 'text' })
    changed = true
  }
  if (!changed) return
  thread.messages.sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0))
  thread.updatedAt = new Date().toISOString()
  all[friendId] = thread
  writeAll(all)
}

// 相手（mock-*）からの自動返信を1件生成する。相手の発言数で返信文をローテーション。
export function addMockReply(friendId: string, myUserId: string): MockChatMessage | null {
  const thread = getThread(friendId)
  if (!thread) return null
  const replies = thread.replies.length > 0 ? thread.replies : DEFAULT_REPLIES
  const fromThemCount = thread.messages.filter(m => m.sender_id === friendId).length
  const content = replies[fromThemCount % replies.length]
  return addMessage(friendId, friendId, myUserId, content)
}
