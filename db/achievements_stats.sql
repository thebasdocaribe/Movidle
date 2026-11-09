-- Contadores pra conquistas (daily streak + endless wins/streak por modo)

ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS win_streak int NOT NULL DEFAULT 0;

ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS best_win_streak int NOT NULL DEFAULT 0;

ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS endless_wins int NOT NULL DEFAULT 0;

ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS endless_streak int NOT NULL DEFAULT 0;

ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS endless_best_streak int NOT NULL DEFAULT 0;
