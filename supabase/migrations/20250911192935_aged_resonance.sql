/*
  # Update Candidate Workflow System

  1. Schema Changes
    - Remove notes column from candidates table (if exists)
    - Remove communications table references for candidates
    - Update candidate status options to: WON, LOST, PENDING, INTERVIEW_SCHEDULED
    - Add interview_scheduled_date column
    - Update interviews table to link properly with candidates

  2. New Workflow
    - Candidates: PENDING → INTERVIEW_SCHEDULED → WON/LOST
    - Actions: Edit, Lost, Interview (Schedule)
    - Interview page shows scheduled candidates
    - Interview actions: Interviewed (WON), Lost
    - Automatic reporting updates for won candidates

  3. Remove Communications
    - Drop communications table for candidates
    - Keep simple candidate tracking without notes/comms
*/

-- Remove notes column from candidates if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'notes'
  ) THEN
    ALTER TABLE candidates DROP COLUMN notes;
  END IF;
END $$;

-- Add interview_scheduled_date column
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS interview_scheduled_date timestamptz;

-- Update candidate status options (remove old statuses, use new workflow)
-- This will be handled in the application logic

-- Create index for interview_scheduled_date
CREATE INDEX IF NOT EXISTS candidates_interview_scheduled_date_idx ON candidates(interview_scheduled_date);

-- Update interviews table to ensure proper candidate linking
-- Add status column to interviews for better tracking
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'no_show', 'cancelled'));

-- Create index for interview status
CREATE INDEX IF NOT EXISTS interviews_status_idx ON interviews(status);

-- Remove communications policies for candidates (keep for clients and training)
-- This will be handled by updating the application logic to not show communications for candidates