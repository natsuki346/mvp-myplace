// detect-dates Edge Function — メッセージ本文から日時表現を抽出する（Anthropic API）
//
// POST /detect-dates  body:{text} → { matches: [{text, date, time}] }
//
// 必要なシークレット：ANTHROPIC_API_KEY（他関数と共用・設定済み）
// 認証は他の関数と同じ方式：x-user-id ヘッダー（UUID形式＋usersテーブル存在チェック）
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
  const { data } = await supabase.from('users').select('id').eq('id', userId).maybeSingle()
  return data ? userId : null
}

// 日本時間(JST)での今日の日付 YYYY-MM-DD
function todayJST(): string {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return now.toISOString().slice(0, 10)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const userId = await resolveUserId(req)
  if (!userId) return json({ error: 'unauthorized' }, 401)

  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  try {
    const body = await req.json().catch(() => null)
    const text = (body?.text ?? '').toString().slice(0, 500)
    if (!text.trim()) return json({ matches: [] })

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json({ matches: [] })

    const today = todayJST()
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `以下のメッセージから日時表現をすべて抽出してください。\n今日の日付は${today}です。\nJSONのみ返してください（前置き・バッククォート不要）:\n{"matches": [{"text": "元のテキスト", "date": "YYYY-MM-DD", "time": "HH:MM"}]}\n日時表現がない場合は {"matches": []} を返してください。\n時刻が不明な場合は time を "" にしてください。\nメッセージ: "${text}"`,
        }],
      }),
    })
    if (!res.ok) return json({ matches: [] })

    const data = await res.json()
    const raw: string = data?.content?.[0]?.text ?? ''
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return json({ matches: [] })

    let matches: { text: string; date: string; time: string }[] = []
    try {
      const parsed = JSON.parse(m[0])
      if (Array.isArray(parsed?.matches)) {
        // メッセージ本文に実在する text だけ採用（誤検出でハイライトが崩れるのを防ぐ）
        matches = parsed.matches
          .filter((x: { text?: string; date?: string }) =>
            typeof x?.text === 'string' && x.text.length > 0 && text.includes(x.text) &&
            typeof x?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date))
          .map((x: { text: string; date: string; time?: string }) => ({
            text: x.text,
            date: x.date,
            time: typeof x.time === 'string' && /^\d{2}:\d{2}$/.test(x.time) ? x.time : '',
          }))
      }
    } catch { /* パース失敗時は空 */ }

    return json({ matches })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return json({ error: msg }, 500)
  }
})
