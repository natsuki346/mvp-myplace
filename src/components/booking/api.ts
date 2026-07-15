// 予約機能の Edge Function クライアント（bookings function）
const BOOKINGS_EDGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/bookings`
const EDGE_AUTH_HEADERS = {
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
}

function headers(userId: string, json = false): HeadersInit {
  return {
    ...EDGE_AUTH_HEADERS,
    'x-user-id': userId,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  }
}

export type Schedule = {
  id: string
  host_user_id: string
  date: string        // YYYY-MM-DD
  start_time: string  // HH:MM:SS
  end_time: string
  is_available: boolean
}

export type BookingUser = { id: string; username: string; avatar_url: string | null }

export type Booking = {
  id: string
  method: 'call' | 'chat' | 'meet' | 'video' | 'text'
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'scheduled'
  created_at: string
  date: string | null
  start_time: string | null
  end_time: string | null
  host: BookingUser | null
  guest: BookingUser | null
  host_tag: string | null
  guest_tag: string | null
}

export const METHOD_META: Record<string, { icon: string; label: string }> = {
  call: { icon: '📞', label: '通話' },
  meet: { icon: '☕', label: '会って話す' },
  chat: { icon: '💬', label: 'チャット' },
}

// "HH:MM:SS" → "HH:MM"
export function fmtTime(t: string | null): string {
  return t ? t.slice(0, 5) : ''
}

// "YYYY-MM-DD" → "M/D(曜)"
export function fmtDate(d: string | null): string {
  if (!d) return ''
  const dt = new Date(`${d}T00:00:00`)
  const wd = ['日', '月', '火', '水', '木', '金', '土'][dt.getDay()]
  return `${dt.getMonth() + 1}/${dt.getDate()}(${wd})`
}

// 作成から24時間以内か（「新着」バッジ用）
export function isNew(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000
}

export async function fetchHostSchedules(userId: string, hostUserId: string): Promise<Schedule[]> {
  const res = await fetch(`${BOOKINGS_EDGE_URL}/schedules?host_user_id=${encodeURIComponent(hostUserId)}`, {
    headers: headers(userId),
  })
  if (!res.ok) throw new Error('failed')
  return res.json()
}

export async function createSchedule(
  userId: string, date: string, startTime: string, endTime: string,
): Promise<boolean> {
  const res = await fetch(`${BOOKINGS_EDGE_URL}/schedules`, {
    method: 'POST',
    headers: headers(userId, true),
    body: JSON.stringify({ date, start_time: startTime, end_time: endTime }),
  })
  return res.ok
}

export async function deleteSchedule(userId: string, scheduleId: string): Promise<boolean> {
  const res = await fetch(`${BOOKINGS_EDGE_URL}/schedules?id=${encodeURIComponent(scheduleId)}`, {
    method: 'DELETE',
    headers: headers(userId),
  })
  return res.ok
}

export async function createBooking(
  userId: string, hostUserId: string, scheduleId: string, method: string,
): Promise<boolean> {
  const res = await fetch(`${BOOKINGS_EDGE_URL}/book`, {
    method: 'POST',
    headers: headers(userId, true),
    body: JSON.stringify({ host_user_id: hostUserId, schedule_id: scheduleId, method }),
  })
  return res.ok
}

export async function fetchBookings(userId: string): Promise<Booking[]> {
  const res = await fetch(BOOKINGS_EDGE_URL, { headers: headers(userId) })
  if (!res.ok) throw new Error('failed')
  return res.json()
}

export async function confirmBooking(userId: string, bookingId: string): Promise<boolean> {
  const res = await fetch(`${BOOKINGS_EDGE_URL}/confirm`, {
    method: 'POST',
    headers: headers(userId, true),
    body: JSON.stringify({ id: bookingId }),
  })
  return res.ok
}

export async function cancelBooking(userId: string, bookingId: string): Promise<boolean> {
  const res = await fetch(`${BOOKINGS_EDGE_URL}/cancel`, {
    method: 'POST',
    headers: headers(userId, true),
    body: JSON.stringify({ id: bookingId }),
  })
  return res.ok
}
