-- DropIndex
DROP INDEX "complaints_user_id_idx";

-- AlterTable
ALTER TABLE "police_stations" ALTER COLUMN "updated_at" DROP DEFAULT;
