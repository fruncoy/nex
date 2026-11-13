-- ============================================================
-- Replace UUID certificate_token with human-readable codes
-- Format: NICHE0001A, NICHE0002B, NICHE0127C ...
--   - NICHE     = fixed prefix
--   - 0001      = sequential number, zero-padded to 4 digits
--   - A         = checksum letter (A-Z, derived from number mod 26)
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Step 1: Change the column type from UUID to TEXT
ALTER TABLE trainee_grades
  ALTER COLUMN certificate_token TYPE TEXT;

-- Step 2: Create a function that generates the custom code
--   Takes a sequential integer, returns e.g. NICHE0001A
CREATE OR REPLACE FUNCTION generate_certificate_code(seq INTEGER)
RETURNS TEXT AS $$
DECLARE
  letter CHAR;
BEGIN
  -- A=0, B=1, ... Z=25, then wraps back to A
  letter := CHR(65 + (seq % 26));
  RETURN 'NICHE' || LPAD(seq::TEXT, 4, '0') || letter;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Backfill existing records with sequential codes
--   Orders by created_at so oldest records get lowest numbers
UPDATE trainee_grades
SET certificate_token = generate_certificate_code(seq::INTEGER)
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS seq
  FROM trainee_grades
) AS numbered
WHERE trainee_grades.id = numbered.id;

-- Step 4: Create a sequence for future auto-generation
--   Starts after however many records currently exist
CREATE SEQUENCE IF NOT EXISTS certificate_code_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  NO CYCLE;

-- Advance the sequence to match current record count
--   so the next new record continues from where backfill left off
SELECT setval(
  'certificate_code_seq',
  (SELECT COUNT(*) FROM trainee_grades)
);

-- Step 5: Create a trigger function that auto-assigns a code
--   on INSERT if no certificate_token is provided
CREATE OR REPLACE FUNCTION assign_certificate_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.certificate_token IS NULL OR NEW.certificate_token = '' THEN
    NEW.certificate_token := generate_certificate_code(
      nextval('certificate_code_seq')::INTEGER
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Attach the trigger to trainee_grades
DROP TRIGGER IF EXISTS trg_assign_certificate_code ON trainee_grades;
CREATE TRIGGER trg_assign_certificate_code
  BEFORE INSERT ON trainee_grades
  FOR EACH ROW
  EXECUTE FUNCTION assign_certificate_code();

-- Step 7: Make the column NOT NULL and UNIQUE
ALTER TABLE trainee_grades
  ALTER COLUMN certificate_token SET NOT NULL;

DROP INDEX IF EXISTS idx_trainee_grades_certificate_token;
CREATE UNIQUE INDEX idx_trainee_grades_certificate_token
  ON trainee_grades (certificate_token);

-- ============================================================
-- After running this:
-- - Existing records get NICHE0001A, NICHE0002B, etc.
-- - New grades inserted automatically get the next code
-- - Verification URL becomes:
--   https://member.nestara.co.ke/verify/NICHE0001A
-- ============================================================
