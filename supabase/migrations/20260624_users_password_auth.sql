-- 簡易パスワード認証の追加 + ユーザー名フォーマットの制約強化。
--
-- password_hash は行レベルセキュリティ(RLS)ではなく列権限(REVOKE)で保護する。
-- RLSは行単位のチェックのみで列を隠す機能はないため、password_hashだけを
-- anon/authenticatedから読み書き不可にし、Edge Function（service_roleキー、
-- RLS・列権限の両方をバイパスする）からのみアクセスできるようにする。
-- Supabase の SQL Editor で実行してください。
--
-- 適用前に必ず確認: 重複ユーザー名がないか
--   select username, count(*) from public.users group by username having count(*) > 1;
-- 重複がある場合、users_username_unique_idx の作成が失敗します。
-- 重複を解消してから本マイグレーションを適用してください。

alter table public.users add column if not exists password_hash text;

revoke select (password_hash) on public.users from anon, authenticated;
revoke insert (password_hash) on public.users from anon, authenticated;
revoke update (password_hash) on public.users from anon, authenticated;

-- ユーザー名の一意性（なりすまし防止の前提条件。今までは未保証だった）
create unique index if not exists users_username_unique_idx on public.users (username);

-- ユーザー名フォーマット制約：半角英数字・_・. のみ、3〜20文字、
-- 先頭/末尾のピリオド禁止、ピリオドの連続禁止。
-- NOT VALID: 本機能導入前に作成された既存ユーザー名は遡って検証しない
-- （旧ルールでは絵文字・日本語等も許可していたため）。新規作成・更新時のみ適用される。
alter table public.users drop constraint if exists users_username_format_check;
alter table public.users add constraint users_username_format_check
  check (
    username ~ '^[a-zA-Z0-9_][a-zA-Z0-9_.]{1,18}[a-zA-Z0-9_]$'
    and username !~ '\.\.'
  ) not valid;
