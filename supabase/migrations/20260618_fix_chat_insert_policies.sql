-- messages / sub_tags / friend_messages への INSERT が
-- 「new row violates row-level security policy」(42501) で失敗する問題の修正。
-- 既存のINSERTポリシーを一度削除してから with check (true) で再作成する。
-- Supabase の SQL Editor で実行してください。

drop policy if exists "messages_insert_all" on public.messages;
create policy "messages_insert_all" on public.messages
  for insert with check (true);

drop policy if exists "sub_tags_insert_all" on public.sub_tags;
create policy "sub_tags_insert_all" on public.sub_tags
  for insert with check (true);

drop policy if exists "friend_messages_insert_all" on public.friend_messages;
create policy "friend_messages_insert_all" on public.friend_messages
  for insert with check (true);
