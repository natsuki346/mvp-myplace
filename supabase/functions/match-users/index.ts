// match-users Edge Function
// POST { user_id, mode: 'help' | 'rescue' }
//
// HELPモード（話を聞いてほしい）:
//   自分の「今の悩み」(shadow) と、他ユーザーの「乗り越えた経験」(light) が一致する人を返す。
// Rescueモード（話を聞いてあげたい）:
//   自分の「乗り越えた経験」(light) と、他ユーザーの「今の悩み」(shadow) が一致する人を返す。
//
// Q3（経験）とQ4（悩み）はタグ語彙が異なるため、テキスト完全一致だけでなく
// 意味カテゴリ（恋愛/仕事/家族/孤独/自己）でも突き合わせる。カテゴリ表に無い
// 自由入力タグはテキスト完全一致で判定する。
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// 経験(Q3)・悩み(Q4)のプリセットタグ → 共通カテゴリ
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

    // help: 自分=悩み(shadow) / 相手=経験(light)
    // rescue: 自分=経験(light) / 相手=悩み(shadow)
    const myType = mode === 'help' ? 'shadow' : 'light'
    const otherType = mode === 'help' ? 'light' : 'shadow'

    const { data: myTags } = await supabase
      .from('tags')
      .select('text')
      .eq('user_id', user_id)
      .eq('type', myType)
      .eq('is_active', true)

    const myTexts = new Set<string>()
    const myCategories = new Set<string>()
    for (const t of (myTags ?? []) as { text: string }[]) {
      myTexts.add(t.text)
      const c = CATEGORY[t.text]
      if (c) myCategories.add(c)
    }

    if (myTexts.size === 0) return json({ users: [] })

    // 他ユーザーの該当タイプのタグを取得（自分は除外）
    const { data: otherTags } = await supabase
      .from('tags')
      .select('user_id, text')
      .eq('type', otherType)
      .eq('is_active', true)
      .neq('user_id', user_id)

    // user_id ごとに、最初にマッチしたタグを代表として保持しつつ一致数も数える
    const matchedTagByUser = new Map<string, string>()
    const matchCountByUser = new Map<string, number>()
    for (const t of (otherTags ?? []) as TagRow[]) {
      const cat = CATEGORY[t.text]
      const isMatch = myTexts.has(t.text) || (cat ? myCategories.has(cat) : false)
      if (!isMatch) continue
      if (!matchedTagByUser.has(t.user_id)) matchedTagByUser.set(t.user_id, t.text)
      matchCountByUser.set(t.user_id, (matchCountByUser.get(t.user_id) ?? 0) + 1)
    }

    const matchedIds = [...matchedTagByUser.keys()]
    if (matchedIds.length === 0) return json({ users: [] })

    // helpモード（Talk to me）：相手＝ワーカーは「オンライン」かつ「通話対応
    // （call/both）」の人だけに絞る。available_methods / is_online カラムが
    // 未追加の環境ではフィルタなしにフォールバックする。
    let users: UserRow[] = []
    if (mode === 'help') {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar_url, is_online, available_methods')
        .in('id', matchedIds)
        .eq('is_online', true)
        .overlaps('available_methods', ['call', 'both'])
      if (error) {
        const { data: fallback } = await supabase
          .from('users')
          .select('id, username, avatar_url')
          .in('id', matchedIds)
        users = (fallback ?? []) as UserRow[]
      } else {
        users = (data ?? []) as UserRow[]
      }
    } else {
      const { data } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .in('id', matchedIds)
      users = (data ?? []) as UserRow[]
    }

    // マッチ度順（タグ一致数が多い順）
    const result = users
      .map((u) => ({
        userId: u.id,
        username: u.username,
        avatar_url: u.avatar_url,
        tag: matchedTagByUser.get(u.id) ?? '',
        matchCount: matchCountByUser.get(u.id) ?? 0,
      }))
      .sort((a, b) => b.matchCount - a.matchCount)

    return json({ users: result })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'unexpected error' }, 500)
  }
})
