-- 20260613_growth_points.sql の tag_events_event_type_check 再作成時に
-- 'visit'（ShadowRoomView.tsxで使用中のイベント種別）が抜けていたため追加する。
-- Supabase の SQL Editor で実行してください。

alter table public.tag_events drop constraint if exists tag_events_event_type_check;

alter table public.tag_events
  add constraint tag_events_event_type_check
  check (event_type in (
    'registered',
    'deactivated',
    'reactivated',
    'room_entered',
    'visit',
    'room_open',
    'chat_open',
    'message_sent'
  ));
