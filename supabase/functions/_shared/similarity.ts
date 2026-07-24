// Daisy（lightタグ＝乗り越えた経験）と Seed（shadowタグ＝今の悩み）の
// 意味的類似度を Anthropic API で 0〜1 のスコアとして算出する共通ヘルパー。
// match-users（Talk me）・match-nearby（Come on）の両方から使う。
//
// ANTHROPIC_API_KEY は `supabase secrets set` で設定したシークレットから読む。
import Anthropic from 'npm:@anthropic-ai/sdk'

// スコアがこの値以上のペアを「類似している」とみなす。
export const SIMILARITY_THRESHOLD = 0.4

const SYSTEM_PROMPT =
  '2つのテキストの意味的な類似度を0から1のスコアで返してください。' +
  'JSONのみ返してください。例：{"score": 0.85}'

export function makeAnthropic(): Anthropic {
  return new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
}

// Daisy テキストと Seed テキストの類似度を 1 回の API 呼び出しで採点する。
// 失敗時・空テキスト時は 0（＝非類似）を返して呼び出し側を止めない。
export async function scoreDaisySeed(
  client: Anthropic,
  daisyText: string,
  seedText: string,
): Promise<number> {
  if (!daisyText.trim() || !seedText.trim()) return 0
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 32,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [
        { role: 'user', content: `テキスト1（Daisy）: ${daisyText}\nテキスト2（Seed）: ${seedText}` },
      ],
    })
    const block = message.content[0]
    if (block.type !== 'text') return 0
    // {"score": 0.85} だけでなく、フェンスや前置きが付いても score 値を拾えるよう正規表現で抽出。
    const m = block.text.match(/"?score"?\s*:\s*([0-9]*\.?[0-9]+)/)
    const score = m ? parseFloat(m[1]) : NaN
    return Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : 0
  } catch {
    return 0
  }
}

// 複数の (Daisy, Seed) ペアを Promise.all でまとめて並列採点し、key→score のマップを返す。
export async function scoreManyDaisySeed(
  client: Anthropic,
  pairs: { key: string; daisyText: string; seedText: string }[],
): Promise<Map<string, number>> {
  const results = await Promise.all(
    pairs.map(async (p) =>
      [p.key, await scoreDaisySeed(client, p.daisyText, p.seedText)] as const,
    ),
  )
  return new Map(results)
}
