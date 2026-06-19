ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trainerId" TEXT;

ALTER TABLE "users"
  ADD CONSTRAINT "users_trainerId_fkey"
  FOREIGN KEY ("trainerId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "users_trainerId_idx" ON "users"("trainerId");
