/*
  # Remove Notes Column from Candidates Table

  1. Schema Changes
    - Remove notes column from candidates table
    - Update any existing data dependencies

  2. Business Logic
    - Communications will handle all notes/comments for candidates
    - Remove notes field from candidate forms
*/

-- Remove notes column from candidates table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'notes'
  ) THEN
    ALTER TABLE candidates DROP COLUMN notes;
  END IF;
END $$;