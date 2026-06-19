-- タグ（種）の成長ポイント・ステージ管理に必要なスキーマ変更
-- Supabase の SQL Editor で実行してください。

-- ── tags.seed_weight / tags.stage ─────────────────────────────────
alter table public.tags add column if not exists seed_weight text default 'light';
-- 'light'（軽い種・合計30pt） or 'heavy'（重い種・合計60pt）

alter table public.tags add column if not exists stage int default 0;
-- 現在の成長ステージ（0〜5、収穫済みは6）

-- ── tag_events.event_type ──────────────────────────────────────────
-- 成長ポイント機能で新たに記録する event_type を許可値に追加する：
--   room_open    : ルームを開いた（+1pt）
--   chat_open    : チャットを開いた（+2pt）
--   message_sent : メッセージを送った（+3pt）
-- 1日1回（JST基準）・セッション内最深のみ加算（src/lib/growthPoint.ts）
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
