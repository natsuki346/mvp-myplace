-- 予約機能（ホストの空き時間管理＋予約）のスキーマ
-- アクセスは bookings Edge Function（service_role）経由のみ。
-- RLSを有効化しポリシーを作らないことで anon/authenticated からの直接アクセスを拒否する。

create table if not exists public.host_schedules (
  id           uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.users(id) on delete cascade,
  date         date not null,
  start_time   time not null,
  end_time     time not null,
  is_available boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists host_schedules_host_date_idx
  on public.host_schedules (host_user_id, date);

create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  host_user_id  uuid not null references public.users(id) on delete cascade,
  guest_user_id uuid not null references public.users(id) on delete cascade,
  schedule_id   uuid references public.host_schedules(id) on delete set null,
  method        text not null check (method in ('call', 'chat', 'meet')),
  status        text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at    timestamptz not null default now()
);

create index if not exists bookings_host_idx  on public.bookings (host_user_id, created_at desc);
create index if not exists bookings_guest_idx on public.bookings (guest_user_id, created_at desc);

-- 直接アクセス拒否（ポリシーなしRLS。service_roleはRLSをバイパスする）
alter table public.host_schedules enable row level security;
alter table public.bookings       enable row level security;
