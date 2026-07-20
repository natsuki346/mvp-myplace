// /home/chat は既存の動くチャット画面（/room/friend/chat）をそのまま表示するルート。
// Rescue「チャットを開く」や Talk me のモックチャットの遷移先として使う。
// friendId / name / tag などは URL クエリで受け取り、モックは localStorage の
// スレッド、実データは Supabase の friend_messages を読む（チャット画面側で分岐）。
export { default } from '@/app/room/friend/chat/page'
