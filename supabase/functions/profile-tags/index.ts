// profile-tags Edge Function
// GET ?target_user_id=xxx
//   → daisyTags: 相手のDaisyタグ全件
//   → seedTags:  相手のSeedタグのうち自分も持っているtextと一致するものだけ
//
// フィルタ前の相手のSeedタグ全件はクライアントに渡さない。
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

async function resolveUserId(req: Request): Promise<string | null> {
  const userId = req.headers.get('x-user-id') ?? ''
  if (!UUID_RE.test(userId)) return null

  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  return data ? userId : null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') return json({ error: 'method not allowed' }, 405)

  const userId = await resolveUserId(req)
  if (!userId) return json({ error: 'unauthorized' }, 401)

  const url = new URL(req.url)
  const targetUserId = url.searchParams.get('target_user_id') ?? ''
  if (!UUID_RE.test(targetUserId)) return json({ error: 'invalid target_user_id' }, 400)

  try {
    const [daisyRes, seedRes, myTagsRes] = await Promise.all([
      // 相手のDaisyタグ（全件）
      supabase
        .from('tags')
        .select('id, text, type')
        .eq('user_id', targetUserId)
        .eq('type', 'light')
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      // 相手のSeedタグ（全件 - サーバーでフィルタ後に返す）
      supabase
        .from('tags')
        .select('id, text, type')
        .eq('user_id', targetUserId)
        .eq('type', 'shadow')
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      // 自分のSeedタグのtext一覧（照合用）
      supabase
        .from('tags')
        .select('text')
        .eq('user_id', userId)
        .eq('type', 'shadow')
        .eq('is_active', true),
    ])

    const mySeedTexts = new Set<string>(
      ((myTagsRes.data ?? []) as { text: string }[]).map((t) => t.text),
    )

    const daisyTags = daisyRes.data ?? []
    const seedTags = ((seedRes.data ?? []) as { id: string; text: string; type: string }[])
      .filter((t) => mySeedTexts.has(t.text))

    return json({ daisyTags, seedTags })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'unexpected error' }, 500)
  }
})
