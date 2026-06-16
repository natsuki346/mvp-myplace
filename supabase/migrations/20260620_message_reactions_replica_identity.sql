-- リアクション削除がリアルタイムでUIに反映されない問題の修正。
--
-- Postgresのデフォルト（REPLICA IDENTITY DEFAULT）では、
-- DELETEイベントの payload.old には主キー(id)しか含まれず、
-- message_id が取得できないため、RoomChat.tsx のリアルタイム購読が
-- `if (!msgId) return` で早期returnしてしまい reactionsMap が更新されない。
--
-- REPLICA IDENTITY FULL にすることで、DELETEの payload.old に
-- 全カラム（message_id, user_id, emoji 等）が含まれるようになる。
-- Supabase の SQL Editor で実行してください。

alter table public.message_reactions replica identity full;
