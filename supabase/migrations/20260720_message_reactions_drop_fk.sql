-- プライベートチャット（friend_messages）のメッセージにもリアクションを付けられるように、
-- message_reactions.message_id から messages への外部キー制約を外す。
--
-- 背景：message_reactions はもともとルームの messages 専用で、message_id に
-- messages(id) への FK があった。プライベートチャットのメッセージは別テーブル
-- （friend_messages）にあるため、その id を入れると FK 違反になる。
-- saved_messages が「モックメッセージも保存対象になるため FK をつけない」方針
-- （20260623_saved_messages.sql 参照）と同じく、message_reactions も FK を外して
-- ルーム・プライベート・モックのどのメッセージ id でもリアクションできるようにする。
--
-- Supabase の SQL Editor で実行してください。

-- FK 制約名は Postgres 既定（<table>_<column>_fkey）。念のため情報スキーマから探して落とす。
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.message_reactions'::regclass
      and contype = 'f'
  loop
    execute format('alter table public.message_reactions drop constraint %I', c.conname);
  end loop;
end $$;
