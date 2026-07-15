// posts Edge Function — 投稿フィードの全DBアクセスを担う
//
// GET  /posts                    → フィード取得（自分と同じタグtextを持つユーザーの投稿・新着30件）
// GET  /posts/comments?post_id=x → コメント一覧（user情報付き）
// POST /posts                    body:{content,tag_id}  → 投稿作成
// POST /posts/react              body:{post_id}         → リアクショントグル
// POST /posts/comment            body:{post_id,content} → コメント追加
// POST /posts/suggest-tags       body:{content}         → AIタグ提案（Anthropic API・要ANTHROPIC_API_KEYシークレット）
//
// 認証は journals と同じ方式：x-user-id ヘッダー（UUID形式＋usersテーブル存在チェック）
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_POST_LENGTH = 140

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

type UserInfo = { id: string; username: string; avatar_url: string | null }
type TagInfo = { id: string; text: string; color: string | null }

async function fetchUsersMap(ids: string[]): Promise<Map<string, UserInfo>> {
  if (ids.length === 0) return new Map()
  const { data } = await supabase
    .from('users')
    .select('id, username, avatar_url')
    .in('id', ids)
  return new Map(((data ?? []) as UserInfo[]).map(u => [u.id, u]))
}

// ── フィード取得 ──
async function getFeed(userId: string) {
  // 自分のタグtext一覧
  const { data: myTags, error: myTagsErr } = await supabase
    .from('tags')
    .select('text')
    .eq('user_id', userId)
    .eq('is_active', true)
  if (myTagsErr) throw myTagsErr

  const myTexts = [...new Set(((myTags ?? []) as { text: string }[]).map(t => t.text))]

  // 同じタグtextを持つ他ユーザー（＋自分）のuser_id一覧
  const userIds = new Set<string>([userId])
  if (myTexts.length > 0) {
    const { data: matching, error: matchErr } = await supabase
      .from('tags')
      .select('user_id')
      .in('text', myTexts)
      .eq('is_active', true)
    if (matchErr) throw matchErr
    for (const row of (matching ?? []) as { user_id: string }[]) userIds.add(row.user_id)
  }

  // 投稿を新着順で取得（上限30件）
  const { data: posts, error: postsErr } = await supabase
    .from('posts')
    .select('id, user_id, content, tag_id, created_at')
    .in('user_id', [...userIds])
    .order('created_at', { ascending: false })
    .limit(30)
  if (postsErr) throw postsErr

  const postRows = (posts ?? []) as { id: string; user_id: string; content: string; tag_id: string | null; created_at: string }[]
  if (postRows.length === 0) return []

  // 投稿者情報・タグ情報・自分のリアクション有無を付与
  const tagIds = [...new Set(postRows.map(p => p.tag_id).filter((v): v is string => !!v))]
  const [usersMap, tagsRes, reactionsRes] = await Promise.all([
    fetchUsersMap([...new Set(postRows.map(p => p.user_id))]),
    tagIds.length > 0
      ? supabase.from('tags').select('id, text, color').in('id', tagIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from('post_reactions')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', postRows.map(p => p.id)),
  ])

  const tagsMap = new Map(((tagsRes.data ?? []) as TagInfo[]).map(t => [t.id, t]))
  const reactedSet = new Set(((reactionsRes.data ?? []) as { post_id: string }[]).map(r => r.post_id))

  return postRows.map(p => ({
    id: p.id,
    content: p.content,
    created_at: p.created_at,
    user: usersMap.get(p.user_id) ?? null,
    tag: p.tag_id ? (tagsMap.get(p.tag_id) ?? null) : null,
    reacted: reactedSet.has(p.id),
  }))
}

// ── AIタグ提案 ──
async function suggestTags(userId: string, content: string) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'AI提案は現在利用できません' }, 503)

  const { data: myTags } = await supabase
    .from('tags')
    .select('text')
    .eq('user_id', userId)
    .eq('is_active', true)
  const texts = [...new Set(((myTags ?? []) as { text: string }[]).map(t => t.text))]
  if (texts.length === 0) return json({ suggested_tags: [] })

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
      system: `ユーザーの投稿内容を読み、以下のタグリストの中から最も関連するタグを1〜3個選んでください。\nタグリスト：${texts.join('・')}\nJSONで返してください：{"suggested_tags": ["タグ名1", "タグ名2"]}`,
      messages: [{ role: 'user', content }],
    }),
  })

  if (!res.ok) return json({ error: 'AI提案に失敗しました' }, 502)

  const body = await res.json()
  const raw: string = body?.content?.[0]?.text ?? ''
  // 応答からJSON部分を抽出（前後に説明文が付くケースに備える）
  const match = raw.match(/\{[\s\S]*\}/)
  let suggested: string[] = []
  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed?.suggested_tags)) {
        // 実在する自分のタグのみに絞る（モデルの創作タグを除外）
        const textSet = new Set(texts)
        suggested = (parsed.suggested_tags as string[]).filter(t => textSet.has(t)).slice(0, 3)
      }
    } catch { /* JSONパース失敗時は空配列 */ }
  }
  return json({ suggested_tags: suggested })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const userId = await resolveUserId(req)
  if (!userId) return json({ error: 'unauthorized' }, 401)

  const url = new URL(req.url)
  // /functions/v1/posts/<sub> の <sub> 部分（無ければ ''）
  const sub = url.pathname.replace(/^.*\/posts\/?/, '').replace(/\/$/, '')

  try {
    if (req.method === 'GET') {
      // GET /posts/comments?post_id=x
      if (sub === 'comments') {
        const postId = url.searchParams.get('post_id')
        if (!postId || !UUID_RE.test(postId)) return json({ error: 'invalid post_id' }, 400)

        const { data, error } = await supabase
          .from('post_comments')
          .select('id, user_id, content, created_at')
          .eq('post_id', postId)
          .order('created_at', { ascending: true })
        if (error) throw error

        const rows = (data ?? []) as { id: string; user_id: string; content: string; created_at: string }[]
        const usersMap = await fetchUsersMap([...new Set(rows.map(r => r.user_id))])
        return json(rows.map(r => ({
          id: r.id,
          content: r.content,
          created_at: r.created_at,
          user: usersMap.get(r.user_id) ?? null,
        })))
      }

      // GET /posts → フィード
      if (sub === '') return json(await getFeed(userId))
      return json({ error: 'not found' }, 404)
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => null)

      // POST /posts/react → リアクショントグル
      if (sub === 'react') {
        const postId = body?.post_id
        if (!postId || !UUID_RE.test(postId)) return json({ error: 'invalid post_id' }, 400)

        const { data: existing } = await supabase
          .from('post_reactions')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', userId)
          .maybeSingle()

        if (existing) {
          const { error } = await supabase.from('post_reactions').delete().eq('id', existing.id)
          if (error) throw error
          return json({ reacted: false })
        }
        const { error } = await supabase
          .from('post_reactions')
          .insert({ post_id: postId, user_id: userId, type: 'like' })
        if (error) throw error
        return json({ reacted: true })
      }

      // POST /posts/comment → コメント追加
      if (sub === 'comment') {
        const postId = body?.post_id
        const content = (body?.content ?? '').trim()
        if (!postId || !UUID_RE.test(postId)) return json({ error: 'invalid post_id' }, 400)
        if (!content) return json({ error: 'content is required' }, 400)

        const { data, error } = await supabase
          .from('post_comments')
          .insert({ post_id: postId, user_id: userId, content })
          .select('id, content, created_at')
          .single()
        if (error) throw error

        const usersMap = await fetchUsersMap([userId])
        return json({ ...data, user: usersMap.get(userId) ?? null }, 201)
      }

      // POST /posts/suggest-tags → AIタグ提案
      if (sub === 'suggest-tags') {
        const content = (body?.content ?? '').trim()
        if (!content) return json({ error: 'content is required' }, 400)
        return await suggestTags(userId, content)
      }

      // POST /posts → 投稿作成
      if (sub === '') {
        const content = (body?.content ?? '').trim()
        const tagId = body?.tag_id ?? null
        if (!content) return json({ error: 'content is required' }, 400)
        if (content.length > MAX_POST_LENGTH) return json({ error: `content must be ${MAX_POST_LENGTH} characters or less` }, 400)
        if (tagId !== null && !UUID_RE.test(tagId)) return json({ error: 'invalid tag_id' }, 400)

        const { data, error } = await supabase
          .from('posts')
          .insert({ user_id: userId, content, tag_id: tagId })
          .select('id, content, tag_id, created_at')
          .single()
        if (error) throw error
        return json(data, 201)
      }

      return json({ error: 'not found' }, 404)
    }

    return json({ error: 'method not allowed' }, 405)
  } catch (err) {
    const msg = err instanceof Error
      ? err.message
      : (typeof err === 'object' && err !== null && 'message' in err)
        ? String((err as { message: unknown }).message)
        : String(err)
    return json({ error: msg }, 500)
  }
})
