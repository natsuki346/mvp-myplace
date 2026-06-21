-- ルーム詳細（BubbleDetailModal）のメモ・ジャーナル機能に必要なスキーマ変更
-- Supabase の SQL Editor で実行してください。

create table if not exists public.journals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  tag_id     uuid not null references public.tags(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journals_user_tag_created_idx
  on public.journals (user_id, tag_id, created_at);

-- anon キーでの読み書きを許可（既存テーブルと同じ運用方針）
alter table public.journals enable row level security;

create policy "journals_select_all" on public.journals
  for select using (true);

create policy "journals_insert_all" on public.journals
  for insert with check (true);

create policy "journals_update_all" on public.journals
  for update using (true);

create policy "journals_delete_all" on public.journals
  for delete using (true);
