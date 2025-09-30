/*
  # Update Candidate Workflow and Role Management

  1. Schema Changes
    - Add role column to candidates table
    - Remove interview_outcome column from candidates table
    - Remove reminder_date column from candidates table
    - Update role options for clients table

  2. Business Logic
    - Candidates with status "scheduled" should be managed via interviews table
    - Automatic reminder logic for pending candidates after 2 days
*/

-- Add role column to candidates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'role'
  ) THEN
    ALTER TABLE candidates ADD COLUMN role text;
  END IF;
END $$;

-- Remove interview_outcome column from candidates table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'interview_outcome'
  ) THEN
    ALTER TABLE candidates DROP COLUMN interview_outcome;
  END IF;
END $$;

-- Remove reminder_date column from candidates table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'reminder_date'
  ) THEN
    ALTER TABLE candidates DROP COLUMN reminder_date;
  END IF;
END $$;

-- Update existing candidates to have default roles if null
UPDATE candidates SET role = 'General' WHERE role IS NULL;

-- Make role column not null with default
ALTER TABLE candidates ALTER COLUMN role SET DEFAULT 'General';
ALTER TABLE candidates ALTER COLUMN role SET NOT NULL;