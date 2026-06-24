// 新規ユーザー作成。ユーザー名フォーマットとパスワード強度をサーバー側でも検証し、
// bcryptでハッシュ化してusersテーブルに保存する。
// SUPABASE_SERVICE_ROLE_KEYはEdge Functionに既定で渡される環境変数のため、
// 別途secretの設定は不要。service_roleキーはRLS・列権限(REVOKE)の両方をバイパスする。
import bcrypt from 'npm:bcryptjs'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const USERNAME_REGEX = /^[a-zA-Z0-9_][a-zA-Z0-9_.]{1,18}[a-zA-Z0-9_]$/
const MIN_PASSWORD_LENGTH = 6

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username) && !username.includes('..')
}

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

    if (typeof username !== 'string' || !isValidUsername(username)) {
      return jsonResponse({
        error: 'ユーザー名は半角英数字・_・.のみ、3〜20文字（先頭/末尾のピリオド・ピリオドの連続は不可）で入力してください',
      }, 400)
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return jsonResponse({ error: `パスワードは${MIN_PASSWORD_LENGTH}文字以上で入力してください` }, 400)
    }

    const { data: existing, error: lookupErr } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle()
    if (lookupErr) throw lookupErr

    if (existing) {
      return jsonResponse({ error: 'このユーザー名は既に使われています' }, 409)
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const { data: created, error } = await supabase
      .from('users')
      .insert([{ username, password_hash: passwordHash }])
      .select('id, username')
      .single()
    if (error) throw error

    return jsonResponse({ user: created })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'unexpected error' }, 500)
  }
})
