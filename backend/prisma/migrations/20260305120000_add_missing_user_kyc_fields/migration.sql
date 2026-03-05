-- Add missing KYC and registration fields to users table
-- These fields were in the Prisma schema but never migrated to the database

ALTER TABLE "users" 
  ADD COLUMN IF NOT EXISTS "date_of_birth" TEXT,
  ADD COLUMN IF NOT EXISTS "care_of" TEXT,
  ADD COLUMN IF NOT EXISTS "residential_address" TEXT,
  ADD COLUMN IF NOT EXISTS "gender" TEXT,
  ADD COLUMN IF NOT EXISTS "registration_complete" BOOLEAN NOT NULL DEFAULT false;

-- Add index for registration_complete for faster queries
CREATE INDEX IF NOT EXISTS "users_registration_complete_idx" ON "users"("registration_complete");
