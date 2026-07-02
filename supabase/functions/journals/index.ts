// journals Edge Function
// GET  ?tag_id=xxx          → user_idのjournals一覧（tag_idで絞り込み）
// POST body:{tag_id,content} → journal作成
// DELETE ?id=xxx            → journal削除（所有者のみ）
//
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY は Edge Function に自動提供される環境変数。
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

  const userId = await resolveUserId(req)
  if (!userId) return json({ error: 'unauthorized' }, 401)

  const url = new URL(req.url)

  try {
    // GET: journals一覧
    if (req.method === 'GET') {
      const tagId = url.searchParams.get('tag_id')
      if (!tagId) return json({ error: 'tag_id is required' }, 400)

      const { data, error } = await supabase
        .from('journals')
        .select('id, content, created_at')
        .eq('user_id', userId)
        .eq('tag_id', tagId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return json(data)
    }

    // POST: journal作成
    if (req.method === 'POST') {
      const body = await req.json().catch(() => null)
      if (!body?.tag_id || !body?.content?.trim()) {
        return json({ error: 'tag_id and content are required' }, 400)
      }

      const { data, error } = await supabase
        .from('journals')
        .insert([{ user_id: userId, tag_id: body.tag_id, content: body.content.trim() }])
        .select('id, content, created_at')
        .single()

      if (error) throw error
      return json(data, 201)
    }

    // DELETE: journal削除（所有者確認）
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id')
      if (!id || !UUID_RE.test(id)) return json({ error: 'invalid id' }, 400)

      const { data: existing } = await supabase
        .from('journals')
        .select('user_id')
        .eq('id', id)
        .maybeSingle()

      if (!existing) return json({ error: 'not found' }, 404)
      if (existing.user_id !== userId) return json({ error: 'forbidden' }, 403)

      const { error } = await supabase.from('journals').delete().eq('id', id)
      if (error) throw error
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    return json({ error: 'method not allowed' }, 405)
  } catch (err) {
    const msg = err instanceof Error
      ? err.message
      : (typeof err === 'object' && err !== null && 'message' in err)
        ? String((err as { message: unknown }).message)
        : String(err)
    return json({ error: msg }, 500)
  }
})
