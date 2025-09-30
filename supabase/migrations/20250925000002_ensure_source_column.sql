/*
  # Ensure Source Column in Candidates Table

  1. Database Changes
    - Ensure source column exists in candidates table
    - Set default value to 'Referral' for new records
    - Update any existing NULL values to 'Referral'
    - Add check constraint for valid source values

  2. Valid Source Values
    - TikTok, Facebook, Instagram, Google Search, Website, Referral, LinkedIn, Walk-in poster
*/

-- Ensure source column exists in candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS source text DEFAULT 'Referral' NOT NULL;

-- Update any existing NULL values to default
UPDATE candidates SET source = 'Referral' WHERE source IS NULL OR source = '';

-- Update existing invalid source values to valid ones
UPDATE candidates SET source = 'TikTok' WHERE source = 'Tiktok';
UPDATE candidates SET source = 'Facebook' WHERE source IN ('Meta', 'meta', 'facebook');
UPDATE candidates SET source = 'Instagram' WHERE source IN ('instagram', 'IG');
UPDATE candidates SET source = 'Website' WHERE source IN ('website', 'Website');
UPDATE candidates SET source = 'Referral' WHERE source IN ('Referrals', 'referrals', 'referral');
UPDATE candidates SET source = 'LinkedIn' WHERE source IN ('linkedin', 'Linkedin');
UPDATE candidates SET source = 'Walk-in poster' WHERE source IN ('Walk-in', 'walk-in', 'poster', 'Poster');
UPDATE candidates SET source = 'Website' WHERE source IN ('WhatsApp', 'whatsapp', 'Other', 'other') AND source NOT IN ('TikTok', 'Facebook', 'Instagram', 'Google Search', 'Website', 'Referral', 'LinkedIn', 'Walk-in poster');

-- Update any remaining invalid values to Referral as fallback
UPDATE candidates SET source = 'Referral' 
WHERE source NOT IN ('TikTok', 'Facebook', 'Instagram', 'Google Search', 'Website', 'Referral', 'LinkedIn', 'Walk-in poster');

-- Ensure the column is NOT NULL
ALTER TABLE candidates ALTER COLUMN source SET NOT NULL;
ALTER TABLE candidates ALTER COLUMN source SET DEFAULT 'Referral';

-- Add check constraint for valid source values (optional but recommended)
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'candidates_source_check' 
    AND table_name = 'candidates'
  ) THEN
    ALTER TABLE candidates DROP CONSTRAINT candidates_source_check;
  END IF;
  
  -- Add new constraint with updated source values
  ALTER TABLE candidates ADD CONSTRAINT candidates_source_check 
    CHECK (source IN ('TikTok', 'Facebook', 'Instagram', 'Google Search', 'Website', 'Referral', 'LinkedIn', 'Walk-in poster'));
END $$;

-- Create index on source column for better query performance
CREATE INDEX IF NOT EXISTS candidates_source_idx ON candidates(source);