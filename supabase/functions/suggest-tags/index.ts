// app/api/suggest-tags/route.ts のSupabase Edge Function版。
// リクエスト/レスポンス形式は元のAPI Routeと同一
// （{ selectedTags, type } -> { tags: string[] }）。
// ANTHROPIC_API_KEYは `supabase secrets set` で設定したシークレットから読む。
import Anthropic from 'npm:@anthropic-ai/sdk'
import { corsHeaders } from '../_shared/cors.ts'

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

const SYSTEM_PROMPT =
  'ユーザーが選んだタグから連想される、似た雰囲気の短いタグを3つだけ返してください。' +
  'すでに選ばれたタグとは重複しないこと。' +
  '2〜8文字の短いフレーズで。#は含めない。' +
  'JSONのみ返す：{"tags": ["...", "...", "..."]}'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function parseTags(raw: string): string[] {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(cleaned)
  if (!Array.isArray(parsed.tags)) return []
  return parsed.tags.filter((t: unknown): t is string => typeof t === 'string')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { selectedTags, type } = await req.json()

    if (!Array.isArray(selectedTags) || selectedTags.length === 0) {
      return jsonResponse({ error: 'selectedTags is required' }, 400)
    }
    if (type !== 'light' && type !== 'shadow') {
      return jsonResponse({ error: 'type must be light or shadow' }, 400)
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{
        role: 'user',
        content: `タグの種別: ${type === 'shadow' ? '根の部屋（影の面）' : '実の部屋（光の面）'}\n登録済みタグ: ${selectedTags.join('、')}`,
      }],
    })

    const block = message.content[0]
    if (block.type !== 'text') {
      return jsonResponse({ error: 'unexpected response' }, 500)
    }

    let tags: string[]
    try {
      tags = parseTags(block.text)
    } catch {
      return jsonResponse({ error: 'failed to parse response' }, 500)
    }

    const suggestions = tags.filter((t: string) => !selectedTags.includes(t)).slice(0, 3)

    return jsonResponse({ tags: suggestions })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'unexpected error' }, 500)
  }
})
