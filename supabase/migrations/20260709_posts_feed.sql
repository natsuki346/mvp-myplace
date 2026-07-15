-- 投稿フィード機能（app/home/feed）のスキーマ
-- アクセスは posts Edge Function（service_role）経由のみ。
-- RLSを有効化しポリシーを作らないことで anon/authenticated からの直接アクセスを拒否する。

create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  content    text not null check (char_length(content) <= 140),
  tag_id     uuid references public.tags(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists posts_user_created_idx
  on public.posts (user_id, created_at desc);

create table if not exists public.post_reactions (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  type       text not null default 'like',
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_created_idx
  on public.post_comments (post_id, created_at);

-- 直接アクセス拒否（ポリシーなしRLS。service_roleはRLSをバイパスする）
alter table public.posts          enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_comments  enable row level security;
