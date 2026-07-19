-- オンボーディング完了時刻。NULL のユーザーは未オンボーディング扱いとし、
-- 起動時ルーティングで /welcome → オンボーディングへ誘導する。
-- 既存ユーザーはこの列が NULL のままになるため、自動的に「初期登録」からやり直す。
alter table public.users add column if not exists onboarded_at timestamptz;
