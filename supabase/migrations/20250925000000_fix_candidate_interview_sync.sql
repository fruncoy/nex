/*
  # Fix Candidate-Interview Synchronization

  1. Schema Fixes
    - Ensure candidates table uses scheduled_date column (not interview_scheduled_date)
    - Add status column to interviews table for proper tracking
    - Add role column to candidates if missing
    - Ensure location column exists in interviews table
    - Ensure proper foreign key constraints

  2. Sync Logic
    - When candidate status = INTERVIEW_SCHEDULED, an interview record must exist
    - When interview is created, candidate status should be INTERVIEW_SCHEDULED
    - When interview outcome is set, candidate status should be updated accordingly

  3. Data Integrity
    - Clean up any inconsistent data
    - Ensure all scheduled candidates have corresponding interview records
*/

-- FIRST: Ensure all required columns exist before any operations

-- Ensure location column exists in interviews table (required by application)
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS location text DEFAULT 'Office' NOT NULL;

-- Ensure role column exists in candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS role text DEFAULT 'General' NOT NULL;

-- Ensure scheduled_date column exists (this is the correct column name)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS scheduled_date timestamptz;

-- Ensure status column exists in interviews table for proper tracking
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS status text DEFAULT 'scheduled' 
  CHECK (status IN ('scheduled', 'completed', 'no_show', 'cancelled'));

-- SECOND: Clean up redundant columns after ensuring all required columns exist

-- Remove interview_scheduled_date column if it exists (this was a mistake in previous migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'interview_scheduled_date'
  ) THEN
    -- Copy data from interview_scheduled_date to scheduled_date if scheduled_date is null
    UPDATE candidates 
    SET scheduled_date = interview_scheduled_date 
    WHERE scheduled_date IS NULL AND interview_scheduled_date IS NOT NULL;
    
    -- Drop the redundant column
    ALTER TABLE candidates DROP COLUMN interview_scheduled_date;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS candidates_scheduled_date_idx ON candidates(scheduled_date);
CREATE INDEX IF NOT EXISTS candidates_status_scheduled_idx ON candidates(status) WHERE status = 'INTERVIEW_SCHEDULED';
CREATE INDEX IF NOT EXISTS interviews_status_idx ON interviews(status);
CREATE INDEX IF NOT EXISTS interviews_candidate_id_idx ON interviews(candidate_id);

-- Ensure data consistency: candidates with INTERVIEW_SCHEDULED status should have interview records
-- This will help identify and fix any sync issues
DO $$
DECLARE
  candidate_record RECORD;
BEGIN
  -- For each candidate with INTERVIEW_SCHEDULED status but no interview
  FOR candidate_record IN 
    SELECT c.id, c.name, c.scheduled_date
    FROM candidates c
    LEFT JOIN interviews i ON c.id = i.candidate_id
    WHERE c.status = 'INTERVIEW_SCHEDULED' 
    AND i.id IS NULL
    AND c.scheduled_date IS NOT NULL
  LOOP
    -- Create missing interview record (location column is guaranteed to exist now)
    INSERT INTO interviews (
      candidate_id,
      date_time,
      location,
      assigned_staff,
      attended,
      outcome,
      notes,
      status
    ) VALUES (
      candidate_record.id,
      candidate_record.scheduled_date,
      'Office',
      (SELECT assigned_to FROM candidates WHERE id = candidate_record.id),
      false,
      null,
      'Auto-created to fix sync issue',
      'scheduled'
    );
  END LOOP;
END $$;

-- Update existing interviews to have proper status
UPDATE interviews 
SET status = CASE 
  WHEN attended = true AND outcome IN ('Won', 'Lost') THEN 'completed'
  WHEN attended = false AND outcome IS NULL THEN 'scheduled'
  WHEN attended = false AND outcome IS NOT NULL THEN 'no_show'
  ELSE 'scheduled'
END
WHERE status IS NULL OR status = '';

-- Create function to maintain sync between candidates and interviews
CREATE OR REPLACE FUNCTION sync_candidate_interview_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When interview is created, ensure candidate status is INTERVIEW_SCHEDULED
  IF TG_OP = 'INSERT' THEN
    UPDATE candidates 
    SET status = 'INTERVIEW_SCHEDULED', scheduled_date = NEW.date_time
    WHERE id = NEW.candidate_id AND status != 'INTERVIEW_SCHEDULED';
    RETURN NEW;
  END IF;
  
  -- When interview is updated with outcome, update candidate status
  IF TG_OP = 'UPDATE' THEN
    IF NEW.outcome IS NOT NULL AND OLD.outcome IS NULL THEN
      UPDATE candidates 
      SET status = CASE 
        WHEN NEW.outcome = 'Won' THEN 'WON'
        WHEN NEW.outcome = 'Lost' THEN 'LOST'
        ELSE status
      END
      WHERE id = NEW.candidate_id;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain sync
DROP TRIGGER IF EXISTS interview_candidate_sync_trigger ON interviews;
CREATE TRIGGER interview_candidate_sync_trigger
  AFTER INSERT OR UPDATE ON interviews
  FOR EACH ROW
  EXECUTE FUNCTION sync_candidate_interview_status();

-- Create function to prevent candidate status changes when interview exists
CREATE OR REPLACE FUNCTION prevent_scheduled_candidate_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent changing status away from INTERVIEW_SCHEDULED if there's an active interview
  IF OLD.status = 'INTERVIEW_SCHEDULED' AND NEW.status != 'INTERVIEW_SCHEDULED' THEN
    IF EXISTS (
      SELECT 1 FROM interviews 
      WHERE candidate_id = NEW.id 
      AND status IN ('scheduled') 
      AND outcome IS NULL
    ) THEN
      RAISE EXCEPTION 'Cannot change candidate status - active interview exists. Please manage from Interviews page.';
    END IF;
  END IF;
  
  -- When status changes to INTERVIEW_SCHEDULED, ensure scheduled_date is set
  IF NEW.status = 'INTERVIEW_SCHEDULED' AND OLD.status != 'INTERVIEW_SCHEDULED' THEN
    IF NEW.scheduled_date IS NULL THEN
      NEW.scheduled_date = NOW() + INTERVAL '1 day';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent inappropriate status changes
DROP TRIGGER IF EXISTS candidate_status_protection_trigger ON candidates;
CREATE TRIGGER candidate_status_protection_trigger
  BEFORE UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION prevent_scheduled_candidate_status_change();