import { supabase } from './client'
import { recordTagEvent } from './events'

/**
 * 同じ text + type を持つ、全ユーザー横断のタグ ID 一覧を返す。
 * 「同じタグを持つ人数」や、共有ルームのメッセージ取得範囲（tag_id 群）に使う。
 * # 有無の揺れを吸収: "存在する" と "#存在する" を同一ルームとして扱う。
 */
export async function getMatchingTags(text: string, type: 'light' | 'shadow'): Promise<string[]> {
  const stripped = text.replace(/^#+/, '')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('tags') as any)
    .select('id')
    .in('text', [stripped, `#${stripped}`])
    .eq('type', type)
    .eq('is_active', true)
  if (error || !data) return []
  return (data as { id: string }[]).map(r => r.id)
}

/** タグの growth_point を +1 */
export async function incrementGrowthPoint(tagId: string): Promise<void> {
  const { data: tag, error: fetchError } = await supabase
    .from('tags')
    .select('growth_point')
    .eq('id', tagId)
    .single()

  if (fetchError) {
    console.error('incrementGrowthPoint fetch error:', fetchError.message)
    return
  }

  const { error: updateError } = await supabase
    .from('tags')
    .update({ growth_point: (tag?.growth_point ?? 0) + 1 })
    .eq('id', tagId)

  if (updateError) console.error('incrementGrowthPoint update error:', updateError.message)
}

/**
 * ルーム閲覧による growth_point 加算（1ユーザー・1タグにつき1日1回まで）。
 * tag_events の room_entered を「本日分の閲覧クレジット済みフラグ」として利用する。
 */
export async function creditDailyView(tagId: string, userId: string): Promise<void> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('tag_events') as any)
    .select('id')
    .eq('tag_id', tagId)
    .eq('user_id', userId)
    .eq('event_type', 'room_entered')
    .gte('created_at', todayStart.toISOString())
    .limit(1)

  if (error) { console.error('creditDailyView error:', error.message); return }
  if (data && data.length > 0) return // 本日は既にクレジット済み

  await incrementGrowthPoint(tagId)
  await recordTagEvent(tagId, userId, 'room_entered')
}
