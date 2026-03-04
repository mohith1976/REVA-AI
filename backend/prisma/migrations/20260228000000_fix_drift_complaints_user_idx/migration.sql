-- Fix: Record existing DB drift (index that was applied outside of Prisma history)
-- This migration brings Prisma's migration history in sync with the actual DB state.
CREATE INDEX IF NOT EXISTS "complaints_user_id_idx" ON "complaints"("user_id");
