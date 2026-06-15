-- Friendタブの1対1チャットに必要なスキーマ変更
-- Supabase の SQL Editor で実行してください。

create table if not exists public.friend_messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid references public.users(id) on delete cascade,
  receiver_id uuid references public.users(id) on delete cascade,
  content     text not null,
  created_at  timestamp with time zone default now()
);

create index if not exists friend_messages_sender_receiver_idx
  on public.friend_messages (sender_id, receiver_id, created_at);

-- anon キーでの読み書きを許可（既存テーブルと同じ運用方針）
alter table public.friend_messages enable row level security;

create policy "friend_messages_select_all" on public.friend_messages
  for select using (true);

create policy "friend_messages_insert_all" on public.friend_messages
  for insert with check (true);

-- Realtime配信を有効化
alter publication supabase_realtime add table public.friend_messages;
