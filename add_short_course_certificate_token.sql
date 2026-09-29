-- ============================================================
-- Add certificate_token to niche_training for short course certs
-- Run in Supabase SQL Editor
-- ============================================================

-- Step 1: Add the column
ALTER TABLE niche_training
  ADD COLUMN IF NOT EXISTS certificate_token TEXT;

-- Step 2: Generate codes continuing from trainee_grades sequence
--   trainee_grades already has 166 records (NICHE0001A–NICHE0166G)
--   Short course tokens start from 167 onwards
UPDATE niche_training
SET certificate_token = generate_certificate_code(seq::INTEGER)
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) + (SELECT COUNT(*) FROM trainee_grades) AS seq
  FROM niche_training
  WHERE certificate_token IS NULL
) AS numbered
WHERE niche_training.id = numbered.id;

-- Step 3: Make unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_niche_training_certificate_token
  ON niche_training (certificate_token)
  WHERE certificate_token IS NOT NULL;

-- Step 4: RLS policy so public verify page can read it
CREATE POLICY "Public can read training for verification"
  ON niche_training
  FOR SELECT
  TO anon
  USING (true);
