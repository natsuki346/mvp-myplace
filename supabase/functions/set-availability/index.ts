// set-availability Edge Function
// POST { user_id, methods?: ('call'|'meet'|'both')[], is_online?: boolean }
//
// ワーカーの対応手段（available_methods）とオンライン状態（is_online）を更新する。
// users テーブルに該当カラムが未追加の環境では ok:false を返すだけでエラーにしない
// （マイグレーション適用前でもアプリの他のフローを止めないため）。
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_METHODS = new Set(['call', 'meet', 'both'])

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  try {
    const { user_id, methods, is_online } = await req.json()
    if (!UUID_RE.test(user_id ?? '')) return json({ error: 'invalid user_id' }, 400)

    const patch: Record<string, unknown> = {}
    if (methods !== undefined) {
      if (!Array.isArray(methods) || methods.length === 0 ||
          !methods.every((m: unknown) => typeof m === 'string' && VALID_METHODS.has(m))) {
        return json({ error: 'invalid methods' }, 400)
      }
      patch.available_methods = methods
    }
    if (is_online !== undefined) {
      if (typeof is_online !== 'boolean') return json({ error: 'invalid is_online' }, 400)
      patch.is_online = is_online
    }
    if (Object.keys(patch).length === 0) return json({ error: 'nothing to update' }, 400)

    const { error } = await supabase.from('users').update(patch).eq('id', user_id)
    if (error) {
      // カラム未追加（42703）などは ok:false で返す（マイグレーション適用前の環境）
      return json({ ok: false, reason: error.message })
    }
    return json({ ok: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'unexpected error' }, 500)
  }
})
