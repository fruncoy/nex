/*
  # Update Candidates Schema

  1. Schema Changes
    - Ensure role column exists in candidates table
    - Remove interview_outcome column if it exists
    - Update status options to match new requirements

  2. Status Options
    - WON, LOST, PENDING, she-will-get-back, call-again-1-day, call-again-2-days, call-again-3-days

  3. Business Logic
    - Conditional reminder logic for call-again statuses
*/

-- Ensure role column exists in candidates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'role'
  ) THEN
    ALTER TABLE candidates ADD COLUMN role text DEFAULT 'General' NOT NULL;
  END IF;
END $$;

-- Remove interview_outcome column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'interview_outcome'
  ) THEN
    ALTER TABLE candidates DROP COLUMN interview_outcome;
  END IF;
END $$;

-- Update existing candidates to have default roles if null
UPDATE candidates SET role = 'General' WHERE role IS NULL OR role = '';

-- Make sure role column is not null
ALTER TABLE candidates ALTER COLUMN role SET NOT NULL;
ALTER TABLE candidates ALTER COLUMN role SET DEFAULT 'General';