// 既存ユーザー名でのログイン検証。bcryptでパスワードハッシュを照合する。
// password_hashが未設定（本機能導入前に作成されたアカウント）の場合は、
// 初回ログイン時に入力されたパスワードをそのまま新しいパスワードとして登録する
// （旧アカウントが永久にログイン不能になることを避けるための救済措置）。
import bcrypt from 'npm:bcryptjs'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { username, password } = await req.json()

    if (typeof username !== 'string' || typeof password !== 'string' || !password) {
      return jsonResponse({ error: 'ユーザー名とパスワードを入力してください' }, 400)
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash')
      .eq('username', username)
      .maybeSingle()
    if (error) throw error

    if (!user) {
      return jsonResponse({ error: 'ユーザー名またはパスワードが正しくありません' }, 401)
    }

    if (!user.password_hash) {
      const passwordHash = await bcrypt.hash(password, 10)
      const { error: updateErr } = await supabase
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('id', user.id)
      if (updateErr) throw updateErr
      return jsonResponse({ user: { id: user.id, username: user.username } })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return jsonResponse({ error: 'ユーザー名またはパスワードが正しくありません' }, 401)
    }

    return jsonResponse({ user: { id: user.id, username: user.username } })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'unexpected error' }, 500)
  }
})
