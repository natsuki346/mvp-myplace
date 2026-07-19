// app/api/generate-tags/route.ts のSupabase Edge Function版。
// リクエスト/レスポンス形式は元のAPI Routeと同一（{ text } -> { tags: string[] }）。
// ANTHROPIC_API_KEYは `supabase secrets set` で設定したシークレットから読む。
import Anthropic from 'npm:@anthropic-ai/sdk'
import { corsHeaders } from '../_shared/cors.ts'

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

// Q2（今の悩み）：現状維持。「今まさにこの悩みを抱えている」が伝わるタグ。
const WORRY_SYSTEM_PROMPT =
  'ユーザーの入力文章から、その人のアイデンティティや感情を表す日本語ハッシュタグをちょうど5個生成してください。' +
  '#をつけて、カンマ区切りで返してください。他の文章は不要です。'

// Q1（乗り越えた経験）：「この人は〇〇を乗り越えた人だ」と読んだ人が思えるタグ。
const EXPERIENCE_SYSTEM_PROMPT =
  'ユーザーの入力文章から、「この人は〇〇を乗り越えた人だ」と読んだ人が思えるような日本語ハッシュタグをちょうど5個生成してください。\n' +
  '条件：\n' +
  '・その人が経験した困難・逆境が伝わること\n' +
  '・乗り越えた強さ・経験が資産として伝わること\n' +
  '・悩んでいる人（シーカー）が「この人なら分かってくれる」と思えるような言葉であること\n' +
  '・1タグは5〜7文字程度の短い言葉にすること\n' +
  '悪い例：#強い #頑張った #経験あり\n' +
  '良い例：#甲子園球児 #挫折から立った #冷笑を越えた者 #逆境を生きた #否定されても前へ\n' +
  '#をつけて、カンマ区切りで返してください。他の文章は不要です。'

// type: 'exp'/'experience' → 経験プロンプト、それ以外（'worry' 等）→ 悩みプロンプト。
function systemPromptFor(type: unknown): string {
  return type === 'exp' || type === 'experience'
    ? EXPERIENCE_SYSTEM_PROMPT
    : WORRY_SYSTEM_PROMPT
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
    const { text, type } = await req.json()

    if (!text?.trim()) {
      return jsonResponse({ error: 'text is required' }, 400)
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: [
        {
          type: 'text',
          text: systemPromptFor(type),
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: text }],
    })

    const block = message.content[0]
    if (block.type !== 'text') {
      return jsonResponse({ error: 'unexpected response' }, 500)
    }

    // モデル出力の形式ゆれ（カンマ区切り・改行区切り・```json フェンス・JSON配列など）に
    // 左右されないよう、本文からハッシュタグのトークンだけを正規表現で拾う。
    // #に続く、空白・カンマ・読点・引用符・閉じ括弧以外の連続文字を1タグとみなす。
    const matches = block.text.match(/#[^\s,、"'\]}]+/g) ?? []
    const seen = new Set<string>()
    const tags = matches
      .map((t: string) => t.trim())
      .filter((t: string) => {
        if (t.length <= 1 || seen.has(t)) return false
        seen.add(t)
        return true
      })

    return jsonResponse({ tags })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'unexpected error' }, 500)
  }
})
