import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

const SYSTEM_PROMPT =
  'ユーザーの入力文章から、その人のアイデンティティや感情を表す日本語ハッシュタグを3〜5個生成してください。' +
  '#をつけて、カンマ区切りで返してください。他の文章は不要です。'

export async function POST(req: NextRequest) {
  const { text } = await req.json()

  if (!text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },  // prompt caching
      },
    ],
    messages: [{ role: 'user', content: text }],
  })

  const block = message.content[0]
  if (block.type !== 'text') {
    return NextResponse.json({ error: 'unexpected response' }, { status: 500 })
  }

  const tags = block.text
    .split(',')
    .map(t => t.trim())
    .filter(t => t.startsWith('#') && t.length > 1)

  return NextResponse.json({ tags })
}
