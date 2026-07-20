-- Rescue の承認フローで送る自動メッセージ（type: 'chat'）を許可するため、
-- friend_messages.type の CHECK 制約に 'chat' を追加する。
-- （'chat' は表示上は通常テキストと同じ吹き出しでレンダリングされる）
-- Supabase の SQL Editor で実行してください。冪等。

alter table public.friend_messages
  drop constraint if exists friend_messages_type_check;

alter table public.friend_messages
  add constraint friend_messages_type_check
  check (type in ('text', 'chat', 'video_room', 'video_scheduled'));
