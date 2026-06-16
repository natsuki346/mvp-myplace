-- tags テーブルを anon ロールで全件読み取り可能にする。
-- このアプリは Supabase Auth を使わず sessionStorage の user_id で識別しているため
-- auth.uid() ベースのポリシーは機能しない。
-- 「同じタグを持つ全ユーザーのルームを共有する」設計上、
-- 他ユーザーのタグ行（id, text, type）を読める必要がある。
-- Supabase の SQL Editor で実行してください。

drop policy if exists "tags_select_all" on public.tags;
create policy "tags_select_all" on public.tags
  for select using (true);

-- RLS が未有効の場合も有効化（既に有効なら no-op）
alter table public.tags enable row level security;
