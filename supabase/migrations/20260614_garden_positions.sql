-- 農園セットアップフロー（タグ配置の2段階編集）に必要なスキーマ変更
-- Supabase の SQL Editor で実行してください。

-- ── tags.position_x / position_y を nullable に ────────────────────
-- null のタグが存在する場合、GardenSetupFlow（配置編集フロー）を表示する目印として使う。
-- 配置確定後はピクセル座標（GardenSetupFlowのフィールド座標系）で保存される。
alter table public.tags alter column position_x drop not null;
alter table public.tags alter column position_y drop not null;
alter table public.tags alter column position_x drop default;
alter table public.tags alter column position_y drop default;

-- ── 既存タグの position_x / position_y をリセット ──────────────────
-- 旧オンボーディングフローでは0〜1の割合値（例: 0.2, 0.74）を保存していたが、
-- GardenSetupFlowはピクセル座標（cx>=0, cy>=0、フィールド幅390x高さ500想定）として扱う。
-- 旧形式の値が残っていると/gardenで全タグが画面左上隅に重なって表示され、
-- 「タグが消えた」ように見えてしまうため、null化してGardenSetupFlowを再実行させる。
update public.tags set position_x = null, position_y = null
where position_x is not null and position_x <= 1
   or position_y is not null and position_y <= 1;
