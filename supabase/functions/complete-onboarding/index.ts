// complete-onboarding Edge Function
// POST { user_id, experienceTags: string[], worryTags: string[] }
//   → 乗り越えた経験（experienceTags）を light タグ、
//     今の悩み（worryTags）を shadow タグとして登録し、
//     users.onboarded_at を now() にする。
//
// 「初期登録に戻す」運用のため、登録前に既存タグをすべて is_active=false に落として
// から新しいタグを入れ直す（再オンボーディング時は経験/悩みだけを持つ状態にする）。
// service_role で実行するため RLS を気にせず users を更新できる。
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// 入力タグを正規化：先頭の # を除去し、前後空白を落とし、空・重複を除く。
function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const text = item.replace(/^#+/, '').trim()
    if (!text || seen.has(text)) continue
    seen.add(text)
    out.push(text)
  }
  return out
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  try {
    const { user_id, experienceTags, worryTags } = await req.json()

    if (!UUID_RE.test(user_id ?? '')) return json({ error: 'invalid user_id' }, 400)

    // ユーザー実在チェック
    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('id', user_id)
      .maybeSingle()
    if (!userRow) return json({ error: 'user not found' }, 404)

    const experience = normalizeTags(experienceTags)
    const worry = normalizeTags(worryTags)
    if (experience.length === 0 && worry.length === 0) {
      return json({ error: 'no tags provided' }, 400)
    }

    // 既存タグを初期化（is_active=false）。ここは失敗しても致命的ではないので握りつぶさず
    // エラーだけ返せるようにしておく。
    const { error: resetErr } = await supabase
      .from('tags')
      .update({ is_active: false })
      .eq('user_id', user_id)
    if (resetErr) return json({ error: `reset failed: ${resetErr.message}` }, 500)

    const rows = [
      ...experience.map((text) => ({
        user_id, text, type: 'light', color: '#F5D78E', is_active: true,
      })),
      ...worry.map((text) => ({
        user_id, text, type: 'shadow', color: '#D4B896', is_active: true,
      })),
    ]

    const { error: insertErr } = await supabase.from('tags').insert(rows)
    if (insertErr) return json({ error: `insert failed: ${insertErr.message}` }, 500)

    // onboarded_at 列がまだ無い環境でも成功扱いにする（ゲートは主にクライアント側の
    // localStorage フラグで行うため、ここはベストエフォート）。列があれば記録する。
    const { error: onboardErr } = await supabase
      .from('users')
      .update({ onboarded_at: new Date().toISOString() })
      .eq('id', user_id)
    const onboardedAtSaved = !onboardErr

    return json({ ok: true, onboardedAtSaved })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'unexpected error' }, 500)
  }
})
