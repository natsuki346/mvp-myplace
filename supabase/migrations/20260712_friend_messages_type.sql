-- 個人チャットにビデオ通話カード・予定カードを追加するための type カラム
-- 'text'（通常バブル） / 'video_room'（通話カード・content=ルームURL）
-- / 'video_scheduled'（予定カード・content={"date","time"}のJSON）
alter table public.friend_messages
  add column if not exists type text not null default 'text'
  check (type in ('text', 'video_room', 'video_scheduled'));
