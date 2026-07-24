// match-users Edge Function（Talk me マッチング）
// POST { user_id, mode: 'help' | 'rescue' }
//
// 用語: Daisy = lightタグ（乗り越えた経験） / Seed = shadowタグ（今の悩み）
//
// HELPモード（話を聞いてほしい）:
//   自分の Seed（悩み）テキストと、他ユーザーの Daisy（経験）テキストを
//   Anthropic API で類似度判定。オンラインの Rescue ユーザーのみ対象。
//   類似度スコア順に上から返す。
// Rescueモード（話を聞いてあげたい）:
//   自分の Daisy（経験）テキストと、HELP側の Seed（悩み）テキストを類似度判定。
//   類似度スコア順に上から返す。相手の Seed そのものは返さず、両者が共通して
//   持つ悩み（commonSeed）だけを返す。
//
// スコアが SIMILARITY_THRESHOLD 以上のユーザーのみ、スコア降順で返す。
// スコアの数値は UI には表示しない（ソートにのみ使う）。
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { makeAnthropic, scoreManyDaisySeed, SIMILARITY_THRESHOLD } from '../_shared/similarity.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const anthropic = makeAnthropic()

// 経験(Q3)・悩み(Q4)のプリセットタグ → 共通カテゴリ。
// Rescue の「共通Seed」判定（両者が持つ似た悩み）に使う。自由入力タグはテキスト一致で判定。
const CATEGORY: Record<string, string> = {
  '失恋・別れ': 'love',
  '挫折・否定された経験': 'self',
  'いじめ・孤立': 'lonely',
  '仕事の挫折': 'work',
  '家族の問題': 'family',
  '起業・挑戦の失敗': 'work',
  '恋愛・人間関係': 'love',
  '仕事・将来': 'work',
  '家族のこと': 'family',
  '自分自身のこと': 'self',
  '孤独感': 'lonely',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type TagRow = { user_id: string; text: string }
type UserRow = { id: string; username: string; avatar_url: string | null }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  try {
    const { user_id, mode } = await req.json()
    if (!UUID_RE.test(user_id ?? '')) return json({ error: 'invalid user_id' }, 400)
    if (mode !== 'help' && mode !== 'rescue') return json({ error: 'invalid mode' }, 400)

    // help  : 自分 = Seed(shadow)  / 相手 = Daisy(light)
    // rescue: 自分 = Daisy(light)  / 相手 = Seed(shadow)
    const myType = mode === 'help' ? 'shadow' : 'light'
    const otherType = mode === 'help' ? 'light' : 'shadow'

    // 自分のタグ（マッチ対象タイプ）を取得
    const { data: myTags } = await supabase
      .from('tags')
      .select('text')
      .eq('user_id', user_id)
      .eq('type', myType)
      .eq('is_active', true)

    const myTexts = ((myTags ?? []) as { text: string }[]).map((t) => t.text)
    if (myTexts.length === 0) return json({ users: [] })
    const myText = myTexts.join('、')

    // Rescue の「共通Seed」判定用に、自分の Seed(shadow) も取得しておく。
    const mySeedCats = new Set<string>()
    const mySeedTexts = new Set<string>()
    if (mode === 'rescue') {
      const { data: myShadow } = await supabase
        .from('tags')
        .select('text')
        .eq('user_id', user_id)
        .eq('type', 'shadow')
        .eq('is_active', true)
      for (const t of (myShadow ?? []) as { text: string }[]) {
        mySeedTexts.add(t.text)
        const c = CATEGORY[t.text]
        if (c) mySeedCats.add(c)
      }
    }

    // 他ユーザーの該当タイプのタグを取得（自分は除外）。user_id ごとにまとめる。
    const { data: otherTags } = await supabase
      .from('tags')
      .select('user_id, text')
      .eq('type', otherType)
      .eq('is_active', true)
      .neq('user_id', user_id)

    const textsByUser = new Map<string, string[]>()
    for (const t of (otherTags ?? []) as TagRow[]) {
      if (!textsByUser.has(t.user_id)) textsByUser.set(t.user_id, [])
      textsByUser.get(t.user_id)!.push(t.text)
    }
    const candidateIds = [...textsByUser.keys()]
    if (candidateIds.length === 0) return json({ users: [] })

    // 表示する候補ユーザーを取得。
    // help: 相手＝Rescueワーカーは「オンライン」かつ「通話対応（call/both）」のみ。
    //       is_online / available_methods 未追加の環境ではフィルタなしにフォールバック。
    let users: UserRow[] = []
    if (mode === 'help') {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar_url, is_online, available_methods')
        .in('id', candidateIds)
        .eq('is_online', true)
        .overlaps('available_methods', ['call', 'both'])
      if (error) {
        const { data: fallback } = await supabase
          .from('users').select('id, username, avatar_url').in('id', candidateIds)
        users = (fallback ?? []) as UserRow[]
      } else {
        users = (data ?? []) as UserRow[]
      }
    } else {
      const { data } = await supabase
        .from('users').select('id, username, avatar_url').in('id', candidateIds)
      users = (data ?? []) as UserRow[]
    }
    if (users.length === 0) return json({ users: [] })

    // 各候補について Daisy×Seed の類似度を Anthropic でまとめて並列採点する。
    //   help  : Daisy = 相手の light   / Seed = 自分の shadow(myText)
    //   rescue: Daisy = 自分の light(myText) / Seed = 相手の shadow
    const scores = await scoreManyDaisySeed(
      anthropic,
      users.map((u) => {
        const theirText = (textsByUser.get(u.id) ?? []).join('、')
        return mode === 'help'
          ? { key: u.id, daisyText: theirText, seedText: myText }
          : { key: u.id, daisyText: myText, seedText: theirText }
      }),
    )

    const result = users
      .map((u) => {
        const theirTexts = textsByUser.get(u.id) ?? []
        // rescue：両者が共通して持つ悩み（テキスト一致 or カテゴリ一致）だけを commonSeed に。
        const commonSeed = mode === 'rescue'
          ? theirTexts.filter((t) => mySeedTexts.has(t) || (CATEGORY[t] ? mySeedCats.has(CATEGORY[t]) : false))
          : []
        return {
          userId: u.id,
          username: u.username,
          avatar_url: u.avatar_url,
          tag: theirTexts[0] ?? '',
          score: scores.get(u.id) ?? 0,
          ...(mode === 'rescue' ? { commonSeed } : {}),
        }
      })
      .filter((u) => u.score >= SIMILARITY_THRESHOLD)
      .sort((a, b) => b.score - a.score)

    return json({ users: result })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'unexpected error' }, 500)
  }
})
