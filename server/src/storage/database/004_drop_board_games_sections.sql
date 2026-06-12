-- 删除 board_games 表的旧规则字段 sections（统一使用 rules 字段）
ALTER TABLE board_games DROP COLUMN IF EXISTS sections;
