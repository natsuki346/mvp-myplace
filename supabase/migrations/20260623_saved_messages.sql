-- チャット内メッセージ・名言の保存（ブックマーク）機能に必要なスキーマ変更
-- Supabase の SQL Editor で実行してください。

create table if not exists public.saved_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  -- モック（デフォルト表示用）メッセージも保存対象になるため、
  -- messages テーブルへの外部キー制約はつけない
  message_id uuid,
  tag_id     uuid references public.tags(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists saved_messages_user_message_idx
  on public.saved_messages (user_id, message_id);

create index if not exists saved_messages_user_tag_created_idx
  on public.saved_messages (user_id, tag_id, created_at);

-- anon キーでの読み書きを許可（既存テーブルと同じ運用方針）
alter table public.saved_messages enable row level security;

create policy "saved_messages_select_all" on public.saved_messages
  for select using (true);

create policy "saved_messages_insert_all" on public.saved_messages
  for insert with check (true);

create policy "saved_messages_delete_all" on public.saved_messages
  for delete using (true);
