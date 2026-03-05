-- Move PostGIS to extensions schema for security best practices
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move extension if it's currently in public
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    -- Move the extension to the dedicated extensions schema
    ALTER EXTENSION postgis SET SCHEMA extensions;
  END IF;
END $$;

-- Enable RLS on spatial_ref_sys as it's often flagged by Supabase even if moved
-- (Though moving it out of public is the primary fix)
ALTER TABLE extensions.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Ensure the search path includes extensions permanently for the database
-- Note: In Supabase, search_path can also be set via the dashboard or per-user.
-- This command sets it at the database level.
ALTER DATABASE postgres SET search_path TO public, extensions;
