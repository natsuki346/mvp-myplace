-- friend_messages のメッセージ送信・受信が失敗する問題の修正。
--
-- 原因：remote DB に auth.uid() ベースの RLS ポリシーが適用されていた
--   INSERT: with check (auth.uid() = sender_id)
--   SELECT: using ((auth.uid() = sender_id) OR (auth.uid() = receiver_id))
-- 本アプリは Supabase Auth セッションを使わず、anon キー＋クライアント側 user_id で
-- 動作するため auth.uid() が常に NULL となり、送信(42501)・読み取り(空)が全て失敗していた。
--
-- 他テーブルと同じ運用方針（anon キーでの読み書きを許可）に戻す。
alter table public.friend_messages enable row level security;

drop policy if exists "friend_messages_insert" on public.friend_messages;
drop policy if exists "friend_messages_insert_all" on public.friend_messages;
create policy "friend_messages_insert_all" on public.friend_messages
  for insert with check (true);

drop policy if exists "friend_messages_select" on public.friend_messages;
drop policy if exists "friend_messages_select_all" on public.friend_messages;
create policy "friend_messages_select_all" on public.friend_messages
  for select using (true);
