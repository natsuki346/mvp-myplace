// bookings Edge Function — 予約機能（ホスト空き時間＋予約）の全DBアクセスを担う
//
// GET    /bookings/schedules?host_user_id=x → ホストの空き時間一覧（is_available=trueのみ）
// POST   /bookings/schedules  body:{date,start_time,end_time} → 空き時間登録（host=認証ユーザー）
// DELETE /bookings/schedules?id=x           → 空き時間削除（所有者のみ）
// POST   /bookings/book  body:{host_user_id,schedule_id,method} → 予約作成（guest=認証ユーザー）
// GET    /bookings                           → 自分が host/guest の予約一覧（相手情報・タグ付き）
// POST   /bookings/confirm body:{id}         → 予約承認（hostのみ）
// POST   /bookings/cancel  body:{id}         → 予約キャンセル（host/guest）＋スケジュール解放
//
// 認証は journals/posts と同じ方式：x-user-id ヘッダー（UUID形式＋usersテーブル存在チェック）
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

type UserInfo = { id: string; username: string; avatar_url: string | null }

async function fetchUsersMap(ids: string[]): Promise<Map<string, UserInfo>> {
  if (ids.length === 0) return new Map()
  const { data } = await supabase.from('users').select('id, username, avatar_url').in('id', ids)
  return new Map(((data ?? []) as UserInfo[]).map(u => [u.id, u]))
}

// 各ユーザーの代表タグ（最初のlightタグ）
async function fetchTagsMap(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const { data } = await supabase
    .from('tags')
    .select('user_id, text')
    .in('user_id', ids)
    .eq('type', 'light')
    .eq('is_active', true)
  const map = new Map<string, string>()
  for (const t of (data ?? []) as { user_id: string; text: string }[]) {
    if (!map.has(t.user_id)) map.set(t.user_id, t.text)
  }
  return map
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const userId = await resolveUserId(req)
  if (!userId) return json({ error: 'unauthorized' }, 401)

  const url = new URL(req.url)
  const sub = url.pathname.replace(/^.*\/bookings\/?/, '').replace(/\/$/, '')

  try {
    // ── スケジュール ──
    if (sub === 'schedules') {
      // GET: ホストの空き時間一覧
      if (req.method === 'GET') {
        const hostId = url.searchParams.get('host_user_id')
        if (!hostId || !UUID_RE.test(hostId)) return json({ error: 'invalid host_user_id' }, 400)
        const { data, error } = await supabase
          .from('host_schedules')
          .select('id, host_user_id, date, start_time, end_time, is_available')
          .eq('host_user_id', hostId)
          .eq('is_available', true)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true })
        if (error) throw error
        return json(data)
      }

      // POST: 空き時間登録（host=認証ユーザー）
      if (req.method === 'POST') {
        const body = await req.json().catch(() => null)
        if (!body?.date || !body?.start_time || !body?.end_time) {
          return json({ error: 'date, start_time, end_time are required' }, 400)
        }
        const { data, error } = await supabase
          .from('host_schedules')
          .insert({
            host_user_id: userId,
            date: body.date,
            start_time: body.start_time,
            end_time: body.end_time,
          })
          .select('id, date, start_time, end_time, is_available')
          .single()
        if (error) throw error
        return json(data, 201)
      }

      // DELETE: 空き時間削除（所有者のみ）
      if (req.method === 'DELETE') {
        const id = url.searchParams.get('id')
        if (!id || !UUID_RE.test(id)) return json({ error: 'invalid id' }, 400)
        const { data: existing } = await supabase
          .from('host_schedules')
          .select('host_user_id')
          .eq('id', id)
          .maybeSingle()
        if (!existing) return json({ error: 'not found' }, 404)
        if (existing.host_user_id !== userId) return json({ error: 'forbidden' }, 403)
        const { error } = await supabase.from('host_schedules').delete().eq('id', id)
        if (error) throw error
        return new Response(null, { status: 204, headers: corsHeaders })
      }

      return json({ error: 'method not allowed' }, 405)
    }

    // ── 日時直指定の予約作成（チャットの日付リンク・📅・🎥から） ──
    // body:{partner_id, date, time, method} … 認証ユーザーを guest、partner を host とする
    if (sub === 'schedule' && req.method === 'POST') {
      const body = await req.json().catch(() => null)
      const partnerId = body?.partner_id
      const date = body?.date
      const time = body?.time
      const method = body?.method ?? 'video'
      if (!partnerId || !UUID_RE.test(partnerId)) return json({ error: 'invalid partner_id' }, 400)
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'invalid date' }, 400)
      if (!['call', 'chat', 'meet', 'video', 'text'].includes(method)) return json({ error: 'invalid method' }, 400)

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          host_user_id: partnerId,
          guest_user_id: userId,
          date,
          time: time || null,
          method,
          status: 'scheduled',
        })
        .select('id, date, time, method, status, created_at')
        .single()
      if (error) throw error
      return json(data, 201)
    }

    // ── 予約作成（guest=認証ユーザー） ──
    if (sub === 'book' && req.method === 'POST') {
      const body = await req.json().catch(() => null)
      const hostId = body?.host_user_id
      const scheduleId = body?.schedule_id
      const method = body?.method
      if (!hostId || !UUID_RE.test(hostId)) return json({ error: 'invalid host_user_id' }, 400)
      if (!scheduleId || !UUID_RE.test(scheduleId)) return json({ error: 'invalid schedule_id' }, 400)
      if (!['call', 'chat', 'meet'].includes(method)) return json({ error: 'invalid method' }, 400)

      // スケジュールが実在し、まだ空いていることを確認
      const { data: schedule } = await supabase
        .from('host_schedules')
        .select('id, host_user_id, is_available')
        .eq('id', scheduleId)
        .maybeSingle()
      if (!schedule || schedule.host_user_id !== hostId) return json({ error: 'schedule not found' }, 404)
      if (!schedule.is_available) return json({ error: 'この時間はすでに予約されています' }, 409)

      const { data, error } = await supabase
        .from('bookings')
        .insert({ host_user_id: hostId, guest_user_id: userId, schedule_id: scheduleId, method })
        .select('id, status, method, created_at')
        .single()
      if (error) throw error

      // スケジュールを埋まり状態に
      await supabase.from('host_schedules').update({ is_available: false }).eq('id', scheduleId)
      return json(data, 201)
    }

    // ── 予約承認 / キャンセル ──
    if ((sub === 'confirm' || sub === 'cancel') && req.method === 'POST') {
      const body = await req.json().catch(() => null)
      const id = body?.id
      if (!id || !UUID_RE.test(id)) return json({ error: 'invalid id' }, 400)

      const { data: booking } = await supabase
        .from('bookings')
        .select('id, host_user_id, guest_user_id, schedule_id, status')
        .eq('id', id)
        .maybeSingle()
      if (!booking) return json({ error: 'not found' }, 404)

      if (sub === 'confirm') {
        // 承認できるのはホストのみ
        if (booking.host_user_id !== userId) return json({ error: 'forbidden' }, 403)
        const { error } = await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id)
        if (error) throw error
        return json({ status: 'confirmed' })
      }

      // cancel はホスト・ゲストどちらでも可
      if (booking.host_user_id !== userId && booking.guest_user_id !== userId) {
        return json({ error: 'forbidden' }, 403)
      }
      const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
      if (error) throw error
      // スケジュールを空き状態に戻す
      if (booking.schedule_id) {
        await supabase.from('host_schedules').update({ is_available: true }).eq('id', booking.schedule_id)
      }
      return json({ status: 'cancelled' })
    }

    // ── 予約一覧（自分が host または guest のもの） ──
    if (sub === '' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, host_user_id, guest_user_id, schedule_id, method, status, created_at, date, time, schedule:host_schedules(date, start_time, end_time)')
        .or(`host_user_id.eq.${userId},guest_user_id.eq.${userId}`)
        .order('created_at', { ascending: false })
      if (error) throw error

      const rows = (data ?? []) as {
        id: string; host_user_id: string; guest_user_id: string; schedule_id: string | null
        method: string; status: string; created_at: string
        date: string | null; time: string | null
        schedule: { date: string; start_time: string; end_time: string } | null
      }[]

      const ids = [...new Set(rows.flatMap(r => [r.host_user_id, r.guest_user_id]))]
      const [usersMap, tagsMap] = await Promise.all([fetchUsersMap(ids), fetchTagsMap(ids)])

      return json(rows.map(r => ({
        id: r.id,
        method: r.method,
        status: r.status,
        created_at: r.created_at,
        // 直指定の date/time（日付リンク等）を優先し、なければスケジュール由来
        date: r.date ?? r.schedule?.date ?? null,
        start_time: r.time ?? r.schedule?.start_time ?? null,
        end_time: r.schedule?.end_time ?? null,
        host: usersMap.get(r.host_user_id) ?? null,
        guest: usersMap.get(r.guest_user_id) ?? null,
        host_tag: tagsMap.get(r.host_user_id) ?? null,
        guest_tag: tagsMap.get(r.guest_user_id) ?? null,
      })))
    }

    return json({ error: 'not found' }, 404)
  } catch (err) {
    const msg = err instanceof Error
      ? err.message
      : (typeof err === 'object' && err !== null && 'message' in err)
        ? String((err as { message: unknown }).message)
        : String(err)
    return json({ error: msg }, 500)
  }
})
