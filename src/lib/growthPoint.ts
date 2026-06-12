import { supabase } from './supabase/client'
import { recordTagEvent } from './supabase/events'

export type ActionDepth = 'room_open' | 'chat_open' | 'message_sent'
export type SeedWeight  = 'light' | 'heavy'

/** 行動ポイント（訪問ごと・セッション内最深のみ加算） */
export const ACTION_POINTS: Record<ActionDepth, number> = {
  room_open:    1,
  chat_open:    2,
  message_sent: 3,
}

/** 軽い種（type: shadow・Q3相当）合計30pt */
export const LIGHT_THRESHOLDS = [0, 2, 7, 14, 19, 26, 30]
/** 重い種（type: shadow・Q4相当）合計60pt */
export const HEAVY_THRESHOLDS = [0, 4, 14, 28, 38, 52, 60]

/** growth_point から成長ステージ（0〜6、6=収穫）を判定する */
export function getStage(growthPoint: number, seedWeight: SeedWeight): number {
  const thresholds = seedWeight === 'light' ? LIGHT_THRESHOLDS : HEAVY_THRESHOLDS
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (growthPoint >= thresholds[i]) return i
  }
  return 0
}

/** セッション内の最深アクションを更新する（a, b のうちポイントの大きい方を返す） */
export function maxDepth(a: ActionDepth | null, b: ActionDepth): ActionDepth {
  if (!a) return b
  return ACTION_POINTS[b] > ACTION_POINTS[a] ? b : a
}

/**
 * セッション内の最深アクションに応じてポイントを確定し、growth_point/stage を更新する。
 * 訪問ごとに毎回加算する（収穫済みの場合のみ加算しない）。
 */
export async function commitSessionPoints(
  tagId: string,
  deepestAction: ActionDepth,
  userId: string,
): Promise<{ newGrowthPoint: number; newStage: number; leveledUp: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: tag, error: fetchError } = await (supabase.from('tags') as any)
    .select('growth_point, stage, seed_weight')
    .eq('id', tagId)
    .single()

  if (fetchError) {
    // stage/seed_weight が未マイグレーション環境ではフォールバック
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fallback = await (supabase.from('tags') as any)
      .select('growth_point')
      .eq('id', tagId)
      .single()
    if (fallback.data) {
      tag = { ...fallback.data, stage: 0, seed_weight: 'light' }
      fetchError = null
    }
  }

  if (fetchError || !tag) {
    console.error('commitSessionPoints fetch error:', fetchError?.message)
    return { newGrowthPoint: 0, newStage: 0, leveledUp: false }
  }

  const seedWeight: SeedWeight = tag.seed_weight === 'heavy' ? 'heavy' : 'light'
  const thresholds  = seedWeight === 'light' ? LIGHT_THRESHOLDS : HEAVY_THRESHOLDS
  const maxPoint    = thresholds[thresholds.length - 1]
  const currentPoint = tag.growth_point ?? 0
  const currentStage = tag.stage ?? 0

  if (currentPoint >= maxPoint) {
    return { newGrowthPoint: currentPoint, newStage: currentStage, leveledUp: false }
  }

  const newGrowthPoint = Math.min(currentPoint + ACTION_POINTS[deepestAction], maxPoint)
  const newStage = getStage(newGrowthPoint, seedWeight)
  const leveledUp = newStage > currentStage

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { error: updateError } = await (supabase.from('tags') as any)
    .update({ growth_point: newGrowthPoint, stage: newStage })
    .eq('id', tagId)

  if (updateError) {
    // stage カラムが未マイグレーション環境ではフォールバック
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const retry = await (supabase.from('tags') as any)
      .update({ growth_point: newGrowthPoint })
      .eq('id', tagId)
    updateError = retry.error
  }

  if (updateError) console.error('commitSessionPoints update error:', updateError.message)

  await recordTagEvent(tagId, userId, deepestAction)

  return { newGrowthPoint, newStage, leveledUp }
}
