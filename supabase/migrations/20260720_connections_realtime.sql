-- Talk me（/help）の承認フロー：ワーカーの承認/辞退を相手にリアルタイム反映するため、
-- connections テーブルを Realtime のパブリケーションに追加する。
-- （承認時の自動メッセージは friend_messages 経由で届くが、辞退は status のみ更新するため
--  connections の変更をシーカー側が購読できる必要がある）
-- Supabase の SQL Editor で実行してください。冪等（重複追加はスキップ）。

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'connections'
  ) then
    alter publication supabase_realtime add table public.connections;
  end if;
end $$;
