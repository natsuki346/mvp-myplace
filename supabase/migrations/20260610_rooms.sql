-- ルーム機能（一覧・チャット・growth_point）に必要なスキーマ変更
-- Supabase の SQL Editor で実行してください。

-- ── tags.growth_point ─────────────────────────────────────────────
alter table public.tags
  add column if not exists growth_point integer not null default 0;

-- growth_point をアトミックに +1 する RPC
create or replace function public.increment_growth_point(p_tag_id uuid)
returns void
language sql
as $$
  update public.tags set growth_point = growth_point + 1 where id = p_tag_id;
$$;

grant execute on function public.increment_growth_point(uuid) to anon, authenticated;

-- ── messages テーブル ─────────────────────────────────────────────
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  tag_id     uuid not null references public.tags(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_tag_id_created_at_idx
  on public.messages (tag_id, created_at);

-- anon キーでの読み書きを許可（既存 tags テーブルと同じ運用方針）
alter table public.messages enable row level security;

create policy "messages_select_all" on public.messages
  for select using (true);

create policy "messages_insert_all" on public.messages
  for insert with check (true);

-- Realtime配信を有効化
alter publication supabase_realtime add table public.messages;
