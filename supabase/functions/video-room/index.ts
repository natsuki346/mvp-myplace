// video-room Edge Function — ビデオ通話（Daily.co）と記録のAI分析
//
// POST /video-room          body:{room_id} → Daily.coルームを作成して {url} を返す
//                           room_id はチャット相手とのuser_idペア（sortして結合）
// POST /video-room/insight  body:{records} → 話した記録からパターンinsightを生成（Anthropic API）
// POST /video-room/report   body:{records} → 期間の記録から振り返りレポート{sections}を生成（Anthropic API）
//
// 必要なシークレット：
//   DAILY_API_KEY     … Daily.co のAPIキー（ルーム作成）
//   ANTHROPIC_API_KEY … AI分析（posts関数と共用・設定済み）
//
// 認証は他の関数と同じ方式：x-user-id ヘッダー（UUID形式＋usersテーブル存在チェック）
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// room_id は "uuid-uuid" 形式（2つのUUIDをソートして結合）
const ROOM_ID_RE = /^[0-9a-f-]{73}$/i

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

// ── Daily.co ルーム作成 ──
async function createRoom(roomId: string) {
  const apiKey = Deno.env.get('DAILY_API_KEY')
  if (!apiKey) return json({ error: 'ビデオ通話は現在利用できません' }, 503)

  // Daily のルーム名は最大41文字・英数と-_のみ。UUIDペアは長すぎるためハッシュ化して短縮する
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(roomId))
  const hash = [...new Uint8Array(digest)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('')
  const name = `daime-${hash}`

  // 既存ルームがあればそのまま返す（同じペアは常に同じルーム）
  const existing = await fetch(`https://api.daily.co/v1/rooms/${name}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (existing.ok) {
    const room = await existing.json()
    // 期限切れでなければ再利用
    if (!room?.config?.exp || room.config.exp * 1000 > Date.now()) {
      return json({ url: room.url })
    }
    await fetch(`https://api.daily.co/v1/rooms/${name}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    })
  }

  const res = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      name,
      properties: {
        exp: Math.floor(Date.now() / 1000) + 3600, // 1時間で期限切れ
        max_participants: 2,
      },
    }),
  })
  if (!res.ok) return json({ error: 'ルームを作成できませんでした' }, 502)
  const room = await res.json()
  return json({ url: room.url })
}

// ── 記録のパターン分析（Anthropic API） ──
async function generateInsight(records: unknown) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'AI分析は現在利用できません' }, 503)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: 'ユーザーの話した記録を分析して一言のパターン insight を日本語で生成してください。\n例：「休日の夜にしんどくなりやすい傾向があります」\nJSON形式のみで返してください：\n{"insight": "分析結果"}',
      messages: [{ role: 'user', content: JSON.stringify(records) }],
    }),
  })
  if (!res.ok) return json({ error: 'AI分析に失敗しました' }, 502)

  const body = await res.json()
  const raw: string = body?.content?.[0]?.text ?? ''
  const match = raw.match(/\{[\s\S]*\}/)
  let insight = ''
  if (match) {
    try { insight = String(JSON.parse(match[0])?.insight ?? '') } catch { /* noop */ }
  }
  return json({ insight })
}

// 期間レポート：指定期間の記録（気持ち・通話・向き合ったタグ・行動）をもとに、
// 数セクションからなる振り返りレポートを生成する。
async function generateReport(records: unknown) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'AI分析は現在利用できません' }, 503)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: [
        'あなたはユーザーの「振り返り」に寄り添うカウンセラーです。',
        '渡される JSON は指定期間の記録です（period=期間, feelings=気持ちの記録[date/feeling/note], calls=話した記録[date/hour/tag], tags=向き合ったハッシュタグの集計, counts=行動の集計）。',
        'これらから、その人の傾向・変化・向き合ったテーマをやさしい日本語で分析し、レポートを作ってください。',
        '3つのセクションで構成し、各 body は1〜2文の温かい語り口にしてください。',
        '- overview: 期間全体のまとめ（気持ちの傾向や活動量）',
        '- themes: どんなテーマ／ハッシュタグに向き合ったか',
        '- suggestion: 次に向けたやさしい提案',
        'データが少ない場合は無理に断定せず、記録を続ける後押しをしてください。',
        'JSON形式のみで返してください：',
        '{"sections":[{"title":"見出し","body":"本文"},{"title":"...","body":"..."},{"title":"...","body":"..."}]}',
      ].join('\n'),
      messages: [{ role: 'user', content: JSON.stringify(records) }],
    }),
  })
  if (!res.ok) return json({ error: 'AI分析に失敗しました' }, 502)

  const body = await res.json()
  const raw: string = body?.content?.[0]?.text ?? ''
  const match = raw.match(/\{[\s\S]*\}/)
  let sections: unknown = []
  if (match) {
    try { sections = JSON.parse(match[0])?.sections ?? [] } catch { /* noop */ }
  }
  return json({ sections })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const userId = await resolveUserId(req)
  if (!userId) return json({ error: 'unauthorized' }, 401)

  const url = new URL(req.url)
  const sub = url.pathname.replace(/^.*\/video-room\/?/, '').replace(/\/$/, '')

  try {
    if (req.method === 'POST' && sub === '') {
      const body = await req.json().catch(() => null)
      const roomId = body?.room_id ?? ''
      if (!ROOM_ID_RE.test(roomId) || !roomId.includes(userId)) {
        return json({ error: 'invalid room_id' }, 400)
      }
      return await createRoom(roomId)
    }

    if (req.method === 'POST' && sub === 'insight') {
      const body = await req.json().catch(() => null)
      if (!body?.records) return json({ error: 'records is required' }, 400)
      return await generateInsight(body.records)
    }

    if (req.method === 'POST' && sub === 'report') {
      const body = await req.json().catch(() => null)
      if (!body?.records) return json({ error: 'records is required' }, 400)
      return await generateReport(body.records)
    }

    return json({ error: 'not found' }, 404)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return json({ error: msg }, 500)
  }
})
