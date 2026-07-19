// match-nearby Edge Function（対面マッチング）
// POST { user_id, lat, lng }
//
// 1. 自分の現在地を user_locations に upsert（service role 経由。
//    RLSで anon の直接読み書きを禁止しても動くよう、書き込みもここで行う）
// 2. updated_at が24時間以内の他ユーザーの位置を取得（鮮度フィルタ）
// 3. ハーバサイン距離 3km 以内に絞る
// 4. シーカーの悩み(shadow) × ワーカーの経験(light) でカテゴリマッチ
// 5. ワーカーは対面対応（available_methods に meet/both）の人だけに絞る
//    （カラム未追加の環境ではフィルタなしにフォールバック）
//
// 位置座標のぼかし（±30m jitter）は既存どおりクライアント側で行う。
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const RADIUS_METERS = 3000
const FRESHNESS_HOURS = 24

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// 経験(Q3)・悩み(Q4)のプリセットタグ → 共通カテゴリ（match-users と同一）
const CATEGORY: Record<string, string> = {
  // 経験 (light / Q3)
  '失恋・別れ': 'love',
  '挫折・否定された経験': 'self',
  'いじめ・孤立': 'lonely',
  '仕事の挫折': 'work',
  '家族の問題': 'family',
  '起業・挑戦の失敗': 'work',
  // 悩み (shadow / Q4)
  '恋愛・人間関係': 'love',
  '仕事・将来': 'work',
  '家族のこと': 'family',
  '自分自身のこと': 'self',
  '孤独感': 'lonely',
}

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
    const { user_id, lat, lng } = await req.json()
    if (!UUID_RE.test(user_id ?? '')) return json({ error: 'invalid user_id' }, 400)
    if (typeof lat !== 'number' || typeof lng !== 'number' ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return json({ error: 'invalid coordinates' }, 400)
    }

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

    // 4. シーカーの悩み(shadow) × ワーカーの経験(light) でマッチ
    const [myTagsRes, theirTagsRes] = await Promise.all([
      supabase.from('tags')
        .select('user_id, type, text')
        .eq('user_id', user_id)
        .eq('type', 'shadow')
        .eq('is_active', true),
      supabase.from('tags')
        .select('user_id, type, text')
        .in('user_id', nearbyIds)
        .eq('type', 'light')
        .eq('is_active', true),
    ])

    const myTexts = new Set<string>()
    const myCategories = new Set<string>()
    for (const t of (myTagsRes.data ?? []) as TagRow[]) {
      myTexts.add(t.text)
      const c = CATEGORY[t.text]
      if (c) myCategories.add(c)
    }

    const matchedTagsByUser = new Map<string, Set<string>>()
    for (const t of (theirTagsRes.data ?? []) as TagRow[]) {
      const cat = CATEGORY[t.text]
      const isMatch = myTexts.has(t.text) || (cat ? myCategories.has(cat) : false)
      if (!isMatch) continue
      if (!matchedTagsByUser.has(t.user_id)) matchedTagsByUser.set(t.user_id, new Set())
      matchedTagsByUser.get(t.user_id)!.add(t.text)
    }

    const matchedIds = [...matchedTagsByUser.keys()]
    if (matchedIds.length === 0) return json({ matches: [] })

    // 5. 対面対応（meet/both）のワーカーだけに絞る。
    //    available_methods カラム未追加の環境ではフィルタなしにフォールバック。
    let users: UserRow[] = []
    {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar_url, available_methods')
        .in('id', matchedIds)
        .overlaps('available_methods', ['meet', 'both'])
      if (error) {
        const { data: fallback } = await supabase
          .from('users')
          .select('id, username, avatar_url')
          .in('id', matchedIds)
        users = (fallback ?? []) as UserRow[]
      } else {
        users = (data ?? []) as UserRow[]
      }
    }
    const userById = new Map(users.map((u) => [u.id, u]))

    const matches = nearby
      .filter((u) => matchedTagsByUser.has(u.userId) && userById.has(u.userId))
      .map((u) => ({
        userId: u.userId,
        username: userById.get(u.userId)?.username ?? '',
        avatar_url: userById.get(u.userId)?.avatar_url ?? null,
        distanceMeters: u.distanceMeters,
        latitude: u.latitude,
        longitude: u.longitude,
        commonTags: [...(matchedTagsByUser.get(u.userId) ?? [])],
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)

    return json({ matches })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'unexpected error' }, 500)
  }
})
