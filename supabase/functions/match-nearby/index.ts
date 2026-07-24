// match-nearby Edge Function（Come on 対面マッチング）
// POST { user_id, lat, lng, mode?: 'help' | 'rescue' }
//
// 用語: Daisy = lightタグ（乗り越えた経験） / Seed = shadowタグ（今の悩み）
//
// 1. 自分の現在地を user_locations に upsert（service role 経由。
//    RLSで anon の直接読み書きを禁止しても動くよう、書き込みもここで行う）
// 2. updated_at が24時間以内の他ユーザーの位置を取得（鮮度フィルタ）
// 3. ハーバサイン距離 3km 以内の全員に絞る
// 4. HELP側・Rescue側共通で Daisy×Seed を Anthropic API で類似度判定
//    （help: 自分Seed×相手Daisy / rescue: 自分Daisy×相手Seed）
// 5. スコアが閾値以上の人だけ、スコア降順で返す（スコア数値は非表示・距離は残す）
// 6. ワーカーは対面対応（available_methods に meet/both）の人だけに絞る
//    （カラム未追加の環境ではフィルタなしにフォールバック）
//
// 位置座標のぼかし（±30m jitter）は既存どおりクライアント側で行う。
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { makeAnthropic, scoreManyDaisySeed, SIMILARITY_THRESHOLD } from '../_shared/similarity.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const RADIUS_METERS = 3000
const FRESHNESS_HOURS = 24

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const anthropic = makeAnthropic()

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type TagRow = { user_id: string; type: 'light' | 'shadow'; text: string }
type LocationRow = { user_id: string; latitude: number; longitude: number }
type UserRow = { id: string; username: string; avatar_url: string | null }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  try {
    const { user_id, lat, lng, mode } = await req.json()
    if (!UUID_RE.test(user_id ?? '')) return json({ error: 'invalid user_id' }, 400)
    if (typeof lat !== 'number' || typeof lng !== 'number' ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return json({ error: 'invalid coordinates' }, 400)
    }
    // help（既定）: 自分 = Seed(shadow) / 相手 = Daisy(light)
    // rescue      : 自分 = Daisy(light) / 相手 = Seed(shadow)
    const isRescue = mode === 'rescue'
    const myType = isRescue ? 'light' : 'shadow'
    const otherType = isRescue ? 'shadow' : 'light'

    // 1. 自分の位置を保存
    const { error: upsertError } = await supabase
      .from('user_locations')
      .upsert(
        { user_id, latitude: lat, longitude: lng, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
    if (upsertError) return json({ error: 'failed to save location' }, 500)

    // 2. 24時間以内に更新された他ユーザーの位置
    const freshAfter = new Date(Date.now() - FRESHNESS_HOURS * 3600_000).toISOString()
    const { data: locations } = await supabase
      .from('user_locations')
      .select('user_id, latitude, longitude')
      .neq('user_id', user_id)
      .gte('updated_at', freshAfter)

    // 3. 2km以内に絞る
    const nearby = ((locations ?? []) as LocationRow[])
      .map((row) => ({
        userId: row.user_id,
        latitude: row.latitude,
        longitude: row.longitude,
        distanceMeters: Math.round(getDistanceMeters(lat, lng, row.latitude, row.longitude)),
      }))
      .filter((u) => u.distanceMeters <= RADIUS_METERS)

    if (nearby.length === 0) return json({ matches: [] })

    const nearbyIds = nearby.map((u) => u.userId)

    // 4. 自分と近くのユーザーのタグを取得（Daisy×Seed 判定用）。
    const [myTagsRes, theirTagsRes] = await Promise.all([
      supabase.from('tags')
        .select('user_id, type, text')
        .eq('user_id', user_id)
        .eq('type', myType)
        .eq('is_active', true),
      supabase.from('tags')
        .select('user_id, type, text')
        .in('user_id', nearbyIds)
        .eq('type', otherType)
        .eq('is_active', true),
    ])

    const myText = ((myTagsRes.data ?? []) as TagRow[]).map((t) => t.text).join('、')
    if (!myText) return json({ matches: [] })

    const textsByUser = new Map<string, string[]>()
    for (const t of (theirTagsRes.data ?? []) as TagRow[]) {
      if (!textsByUser.has(t.user_id)) textsByUser.set(t.user_id, [])
      textsByUser.get(t.user_id)!.push(t.text)
    }

    // 5. 対面対応（meet/both）のワーカーだけに絞る。
    //    available_methods カラム未追加の環境ではフィルタなしにフォールバック。
    const taggedIds = nearbyIds.filter((id) => textsByUser.has(id))
    if (taggedIds.length === 0) return json({ matches: [] })

    let users: UserRow[] = []
    {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar_url, available_methods')
        .in('id', taggedIds)
        .overlaps('available_methods', ['meet', 'both'])
      if (error) {
        const { data: fallback } = await supabase
          .from('users')
          .select('id, username, avatar_url')
          .in('id', taggedIds)
        users = (fallback ?? []) as UserRow[]
      } else {
        users = (data ?? []) as UserRow[]
      }
    }
    const userById = new Map(users.map((u) => [u.id, u]))

    // 6. Daisy×Seed の類似度を Anthropic でまとめて並列採点。
    //    help: Daisy=相手 / Seed=自分(myText) ／ rescue: Daisy=自分(myText) / Seed=相手
    const scores = await scoreManyDaisySeed(
      anthropic,
      users.map((u) => {
        const theirText = (textsByUser.get(u.id) ?? []).join('、')
        return isRescue
          ? { key: u.id, daisyText: myText, seedText: theirText }
          : { key: u.id, daisyText: theirText, seedText: myText }
      }),
    )

    // 類似スコアが閾値以上の人だけ、スコア降順で返す（距離は残す・スコア数値は非表示）。
    const matches = nearby
      .filter((u) => userById.has(u.userId) && (scores.get(u.userId) ?? 0) >= SIMILARITY_THRESHOLD)
      .map((u) => ({
        userId: u.userId,
        username: userById.get(u.userId)?.username ?? '',
        avatar_url: userById.get(u.userId)?.avatar_url ?? null,
        distanceMeters: u.distanceMeters,
        latitude: u.latitude,
        longitude: u.longitude,
        commonTags: textsByUser.get(u.userId) ?? [],
        score: scores.get(u.userId) ?? 0,
      }))
      .sort((a, b) => b.score - a.score)

    return json({ matches })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'unexpected error' }, 500)
  }
})
