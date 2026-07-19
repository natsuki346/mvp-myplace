-- Talk to me / Come on 用のワーカー稼働設定
-- available_methods: 'call'（通話）/ 'meet'（対面）/ 'both'（両方）
-- is_online: ログイン（モード選択）時に true、ログアウト時に false
alter table public.users add column if not exists available_methods text[] not null default '{call}';
alter table public.users add column if not exists is_online boolean not null default false;
