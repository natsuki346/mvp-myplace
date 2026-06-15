-- つながり申請の「断る」状態を許可するよう status の制約を更新
-- Supabase の SQL Editor で実行してください。

alter table public.connections
  drop constraint if exists connections_status_check;

alter table public.connections
  add constraint connections_status_check
  check (status in ('pending', 'accepted', 'rejected'));
