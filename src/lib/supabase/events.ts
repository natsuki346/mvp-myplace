import { supabase } from './client'

export type EventType =
  | 'registered' | 'deactivated' | 'reactivated' | 'room_entered'
  | 'room_open' | 'chat_open' | 'message_sent' | 'visit'

/**
 * tag_events に1件記録（fire-and-forget）。
 * UI をブロックしないよう呼び出し元では await しないこと。
 */
export async function recordTagEvent(
  tagId:  string,
  userId: string,
  eventType: EventType,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('tag_events') as any).insert([{
    tag_id:     tagId,
    user_id:    userId,
    event_type: eventType,
  }])
  if (error) console.error(`recordTagEvent(${eventType}) error:`, error.message)
}

/** タグを非アクティブ化 + deactivated イベント記録 */
export async function deactivateTag(tagId: string, userId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('tags') as any)
    .update({ is_active: false })
    .eq('id', tagId)
    .eq('user_id', userId)
  if (error) { console.error('deactivateTag error:', error.message); return }
  await recordTagEvent(tagId, userId, 'deactivated')
}

/** users テーブルを部分更新（fire-and-forget） */
export async function updateUser(userId: string, data: Record<string, unknown>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('users') as any).update(data).eq('id', userId)
  if (error) console.error('updateUser error:', error.message)
}

/** タグを再アクティブ化 + reactivated イベント記録 */
export async function reactivateTag(tagId: string, userId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('tags') as any)
    .update({ is_active: true })
    .eq('id', tagId)
    .eq('user_id', userId)
  if (error) { console.error('reactivateTag error:', error.message); return }
  await recordTagEvent(tagId, userId, 'reactivated')
}
