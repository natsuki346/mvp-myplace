import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

const SYSTEM_PROMPT =
  'ユーザーが選んだタグから連想される、似た雰囲気の短いタグを3つだけ返してください。' +
  'すでに選ばれたタグとは重複しないこと。' +
  '2〜8文字の短いフレーズで。#は含めない。' +
  'JSONのみ返す：{"tags": ["...", "...", "..."]}'

function parseTags(raw: string): string[] {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(cleaned)
  if (!Array.isArray(parsed.tags)) return []
  return parsed.tags.filter((t: unknown): t is string => typeof t === 'string')
}

export async function POST(req: NextRequest) {
  const { selectedTags, type } = await req.json()

  if (!Array.isArray(selectedTags) || selectedTags.length === 0) {
    return NextResponse.json({ error: 'selectedTags is required' }, { status: 400 })
  }
  if (type !== 'light' && type !== 'shadow') {
    return NextResponse.json({ error: 'type must be light or shadow' }, { status: 400 })
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
    return NextResponse.json({ error: 'unexpected response' }, { status: 500 })
  }

  let tags: string[]
  try {
    tags = parseTags(block.text)
  } catch {
    return NextResponse.json({ error: 'failed to parse response' }, { status: 500 })
  }

  const suggestions = tags.filter(t => !selectedTags.includes(t)).slice(0, 3)

  return NextResponse.json({ tags: suggestions })
}
