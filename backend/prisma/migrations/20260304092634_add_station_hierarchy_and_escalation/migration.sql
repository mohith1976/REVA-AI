  - A unique constraint covering the columns `[external_id]` on the table `police_stations` will be added.

*/
-- CreateEnum
CREATE TYPE "StationRank" AS ENUM ('STATION', 'CIRCLE', 'SUBDIVISION', 'DISTRICT');

-- AlterEnum: add missing roles
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'GLOBAL_ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DISTRICT_ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DIVISION_ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CIRCLE_ADMIN';

-- AlterTable: complaints escalation tracking fields
ALTER TABLE "complaints"
  ADD COLUMN IF NOT EXISTS "last_migrated_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "migration_count"  INTEGER NOT NULL DEFAULT 0;

-- AlterTable: police_stations hierarchy & APSAC fields
-- NOTE: updated_at gets DEFAULT NOW() so existing rows are safely backfilled
ALTER TABLE "police_stations"
  ADD COLUMN IF NOT EXISTS "address"           TEXT,
  ADD COLUMN IF NOT EXISTS "circle_name"       TEXT,
  ADD COLUMN IF NOT EXISTS "data_source"       TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "district_code"     TEXT,
  ADD COLUMN IF NOT EXISTS "division_name"     TEXT,
  ADD COLUMN IF NOT EXISTS "external_id"       TEXT,
  ADD COLUMN IF NOT EXISTS "parent_station_id" TEXT,
  ADD COLUMN IF NOT EXISTS "pincode"           TEXT,
  ADD COLUMN IF NOT EXISTS "sub_division_name" TEXT,
  ADD COLUMN IF NOT EXISTS "rank"              "StationRank" NOT NULL DEFAULT 'STATION',
  ADD COLUMN IF NOT EXISTS "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- CreateIndex: unique external_id for APSAC sync integrity
CREATE UNIQUE INDEX IF NOT EXISTS "police_stations_external_id_key"
  ON "police_stations"("external_id");

-- AddForeignKey: hierarchy self-reference (station -> district HQ)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'police_stations_parent_station_id_fkey'
  ) THEN
    ALTER TABLE "police_stations"
      ADD CONSTRAINT "police_stations_parent_station_id_fkey"
      FOREIGN KEY ("parent_station_id")
      REFERENCES "police_stations"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
