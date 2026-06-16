-- users テーブルの読み取りをanon/authenticated双方に許可するポリシーを追加。
-- このアプリは Supabase Auth を使わず sessionStorage の user_id で識別しているため
-- 全リクエストは anon ロールになる（messages 等と同じ運用方針）。
--
-- 重要: 現在 users テーブルはRLSが無効（=誰でも読める）。
-- ポリシーを先に作成してから RLS を有効化することで、
-- 万一ポリシー作成が失敗してもテーブルがロックされない順序にしている。
-- Supabase の SQL Editor で実行してください。

drop policy if exists "users_select_all" on public.users;
create policy "users_select_all" on public.users
  for select using (true);

alter table public.users enable row level security;

-- messages のポリシーを再確認（20260618で対応済みだが、念のため再実行しても安全）
drop policy if exists "messages_select_all" on public.messages;
create policy "messages_select_all" on public.messages
  for select using (true);

drop policy if exists "messages_insert_all" on public.messages;
create policy "messages_insert_all" on public.messages
  for insert with check (true);
