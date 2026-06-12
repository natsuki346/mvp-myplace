import { supabase } from './client'

export type SubTag = {
  id:            string
  parent_tag_id: string
  name:          string
  user_id:       string
  created_at:    string
}

/** 親タグ群（同じ text+type を持つ全ユーザーのタグid）に紐づくサブタグ（チャンネル）一覧を作成順で取得 */
export async function getSubTags(parentTagIds: string[]): Promise<SubTag[]> {
  if (parentTagIds.length === 0) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('sub_tags') as any)
    .select('id, parent_tag_id, name, user_id, created_at')
    .in('parent_tag_id', parentTagIds)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data as SubTag[]
}

/** サブタグ（チャンネル）を新規作成 */
export async function createSubTag(parentTagId: string, userId: string, name: string): Promise<SubTag | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('sub_tags') as any)
    .insert([{ parent_tag_id: parentTagId, user_id: userId, name }])
    .select('id, parent_tag_id, name, user_id, created_at')
    .single()

  if (error || !data) return null
  return data as SubTag
}
