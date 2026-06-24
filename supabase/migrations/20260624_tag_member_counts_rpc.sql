-- タグ生成画面で「同じタグを持つ人数」を表示するためのRPC。
-- tagsテーブルへの直接SELECTはRLS（anyone can read tags / using: true）で
-- 既にanon/authenticatedに許可されているが、クライアント側でGROUP BY集計するのではなく、
-- 1回の呼び出しで確実に集計済みの件数だけを取得できるようにRPC化する。
-- 個々のユーザーを特定する情報（user_id等）は返さず、タグ文字列と件数のみを返す。
create or replace function public.get_tag_member_counts(tag_texts text[], tag_type text)
returns table(tag_text text, member_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select text as tag_text, count(*)::bigint as member_count
  from public.tags
  where text = any(tag_texts)
    and type = tag_type
    and is_active = true
  group by text
$$;

grant execute on function public.get_tag_member_counts(text[], text) to anon, authenticated;
