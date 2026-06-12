-- ルームのサブタグ（チャンネル）機能に必要なスキーマ変更
-- Supabase の SQL Editor で実行してください。

-- ── sub_tags テーブル ─────────────────────────────────────────────
create table if not exists public.sub_tags (
  id             uuid primary key default gen_random_uuid(),
  parent_tag_id  uuid not null references public.tags(id) on delete cascade,
  name           text not null,
  user_id        uuid not null references public.users(id) on delete cascade,
  created_at     timestamptz not null default now()
);

create index if not exists sub_tags_parent_tag_id_created_at_idx
  on public.sub_tags (parent_tag_id, created_at);

-- anon キーでの読み書きを許可（messages テーブルと同じ運用方針。
-- このアプリは Supabase Auth を使わず sessionStorage の user_id で識別しているため
-- auth.uid() ベースのチェックではなく with check (true) とする）
alter table public.sub_tags enable row level security;

create policy "sub_tags_select_all" on public.sub_tags
  for select using (true);

create policy "sub_tags_insert_all" on public.sub_tags
  for insert with check (true);

-- ── messages.sub_tag_id ───────────────────────────────────────────
alter table public.messages
  add column if not exists sub_tag_id uuid references public.sub_tags(id) on delete cascade;

create index if not exists messages_sub_tag_id_created_at_idx
  on public.messages (sub_tag_id, created_at);
