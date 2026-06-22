// app/api/generate-tags/route.ts のSupabase Edge Function版。
// リクエスト/レスポンス形式は元のAPI Routeと同一（{ text } -> { tags: string[] }）。
// ANTHROPIC_API_KEYは `supabase secrets set` で設定したシークレットから読む。
import Anthropic from 'npm:@anthropic-ai/sdk'
import { corsHeaders } from '../_shared/cors.ts'

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

const SYSTEM_PROMPT =
  'ユーザーの入力文章から、その人のアイデンティティや感情を表す日本語ハッシュタグをちょうど5個生成してください。' +
  '#をつけて、カンマ区切りで返してください。他の文章は不要です。'

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
    const { text } = await req.json()

    if (!text?.trim()) {
      return jsonResponse({ error: 'text is required' }, 400)
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: text }],
    })

    const block = message.content[0]
    if (block.type !== 'text') {
      return jsonResponse({ error: 'unexpected response' }, 500)
    }

    const tags = block.text
      .split(',')
      .map((t: string) => t.trim())
      .filter((t: string) => t.startsWith('#') && t.length > 1)

    return jsonResponse({ tags })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'unexpected error' }, 500)
  }
})
