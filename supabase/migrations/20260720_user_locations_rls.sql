-- 対面マッチング用の位置情報テーブル（本番には既に存在するため IF NOT EXISTS）。
-- 位置情報は個人情報のため、anon からの直接読み書きを全面禁止し、
-- match-nearby Edge Function（service role）経由のみでアクセスする。

create table if not exists public.user_locations (
  user_id    uuid primary key references public.users (id) on delete cascade,
  latitude   double precision not null,
  longitude  double precision not null,
  updated_at timestamptz not null default now()
);

-- RLS を有効化し、ポリシーを一切作らない＝anon/authenticated は読み書き不可。
-- service role は RLS をバイパスするため Edge Function は影響を受けない。
alter table public.user_locations enable row level security;

-- 念のため既存の許可ポリシーがあれば削除する
drop policy if exists "user_locations_select" on public.user_locations;
drop policy if exists "user_locations_insert" on public.user_locations;
drop policy if exists "user_locations_update" on public.user_locations;
drop policy if exists "Enable read access for all users" on public.user_locations;
drop policy if exists "Enable insert for all users" on public.user_locations;
drop policy if exists "Enable update for all users" on public.user_locations;

revoke all on public.user_locations from anon, authenticated;
