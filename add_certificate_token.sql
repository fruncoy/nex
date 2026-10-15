-- ============================================================
-- QR Certificate Verification — Database Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add a unique, tamper-proof token to every grade record.
--    This UUID is what gets encoded into the QR code URL.
ALTER TABLE trainee_grades
  ADD COLUMN IF NOT EXISTS certificate_token UUID DEFAULT gen_random_uuid();

-- 2. Backfill tokens for any existing records that don't have one yet.
UPDATE trainee_grades
  SET certificate_token = gen_random_uuid()
  WHERE certificate_token IS NULL;

-- 3. Make it required and unique going forward.
ALTER TABLE trainee_grades
  ALTER COLUMN certificate_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trainee_grades_certificate_token
  ON trainee_grades (certificate_token);

-- ============================================================
-- OPTIONAL: RLS policy — only needed if Row Level Security
-- is enabled on the trainee_grades table.
-- Run this if the public verification page returns "permission denied".
-- ============================================================

-- CREATE POLICY "Public can verify certificates"
--   ON trainee_grades
--   FOR SELECT
--   TO anon
--   USING (certificate_token IS NOT NULL);
