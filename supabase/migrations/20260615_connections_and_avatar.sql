-- プロフィール画面（つながり機能・アバター）に必要なスキーマ変更
-- Supabase の SQL Editor で実行してください。

-- ── users.avatar_url ──────────────────────────────────────────────
alter table public.users
  add column if not exists avatar_url text;

-- ── connections テーブル ───────────────────────────────────────────
create table if not exists public.connections (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid references public.users(id) on delete cascade,
  receiver_id  uuid references public.users(id) on delete cascade,
  status       text default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamp with time zone default now(),
  unique(requester_id, receiver_id)
);

create index if not exists connections_requester_id_idx on public.connections (requester_id);
create index if not exists connections_receiver_id_idx on public.connections (receiver_id);

-- anon キーでの読み書きを許可（既存テーブルと同じ運用方針）
alter table public.connections enable row level security;

create policy "connections_select_all" on public.connections
  for select using (true);

create policy "connections_insert_all" on public.connections
  for insert with check (true);

create policy "connections_update_all" on public.connections
  for update using (true);

create policy "connections_delete_all" on public.connections
  for delete using (true);

-- ── avatars ストレージバケット ──────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_select_all" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_insert_all" on storage.objects
  for insert with check (bucket_id = 'avatars');

create policy "avatars_update_all" on storage.objects
  for update using (bucket_id = 'avatars');
