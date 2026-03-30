/*
  # Update Candidate Status System

  1. Schema Changes
    - Ensure role column exists in candidates table
    - Remove outcome column if it exists
    - Update status options to new system: WON, LOST, PENDING, WILL GET BACK, CALL AGAIN
    - Add scheduled_date column for WILL GET BACK and TO BE CALLED statuses

  2. Status Options
    - WON, LOST, PENDING, WILL GET BACK, CALL AGAIN

  3. Business Logic
    - Conditional reminder logic for WILL GET BACK and TO BE CALLED statuses
    - Scheduled date tracking for follow-ups
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

-- Remove outcome column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'outcome'
  ) THEN
    ALTER TABLE candidates DROP COLUMN outcome;
  END IF;
END $$;

-- Add scheduled_date column for WILL GET BACK and TO BE CALLED statuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'scheduled_date'
  ) THEN
    ALTER TABLE candidates ADD COLUMN scheduled_date date;
  END IF;
END $$;

-- Update existing candidates to have default roles if null
UPDATE candidates SET role = 'General' WHERE role IS NULL OR role = '';

-- Make sure role column is not null
ALTER TABLE candidates ALTER COLUMN role SET NOT NULL;
ALTER TABLE candidates ALTER COLUMN role SET DEFAULT 'General';

-- Update existing statuses to new system (optional - can be done manually)
-- UPDATE candidates SET status = 'PENDING' WHERE status IN ('pending', 'new', 'contacted');
-- UPDATE candidates SET status = 'WON' WHERE status IN ('hired', 'scheduled');
-- UPDATE candidates SET status = 'LOST' WHERE status IN ('rejected', 'failed');