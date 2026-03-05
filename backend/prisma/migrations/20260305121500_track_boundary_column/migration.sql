-- Track the manually-added boundary column in police_stations
-- This column was added outside of Prisma migrations for PostGIS support
-- We're just documenting it here to prevent drift detection

-- The boundary column already exists in the database, so we use IF NOT EXISTS
-- to make this migration idempotent and safe to run multiple times

DO $$ 
BEGIN
  -- Check if boundary column exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'police_stations' 
    AND column_name = 'boundary'
  ) THEN
    -- Add boundary column as PostGIS GEOGRAPHY type
    -- GEOGRAPHY uses lat/lng coordinates and calculates distances in meters
    ALTER TABLE "police_stations" 
      ADD COLUMN "boundary" GEOGRAPHY(POLYGON, 4326);
    
    -- Add spatial index for fast geofencing queries
    CREATE INDEX "police_stations_boundary_idx" 
      ON "police_stations" USING GIST ("boundary");
  END IF;
END $$;

-- Note: This migration is safe to run even if the column already exists
-- It will simply do nothing in that case
