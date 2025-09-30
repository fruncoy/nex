/*
  # Fix interviews table location column

  This migration ensures the location column exists in the interviews table
  before any other operations that depend on it.
*/

-- Ensure location column exists in interviews table
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS location text DEFAULT 'Office' NOT NULL;

-- Update any existing records that might have NULL location
UPDATE interviews SET location = 'Office' WHERE location IS NULL;