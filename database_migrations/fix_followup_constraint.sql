-- Fix placement_followups constraint to allow new followup types
-- Drop the existing constraint and add a new one with all valid types

-- Drop the existing check constraint
ALTER TABLE placement_followups DROP CONSTRAINT IF EXISTS placement_followups_followup_type_check;

-- Add new constraint with twice-monthly and salary followup types
ALTER TABLE placement_followups ADD CONSTRAINT placement_followups_followup_type_check 
CHECK (followup_type IN ('2_week', 'salary'));

-- Update the trigger function to create twice-monthly followups for 3 months
CREATE OR REPLACE FUNCTION create_placement_followups()
RETURNS TRIGGER AS $$
BEGIN
  -- Create 2-week follow-ups for 3 months (6 total)
  INSERT INTO placement_followups (placement_id, followup_type, due_date, created_by)
  SELECT 
    NEW.id,
    '2_week',
    (NEW.placement_date + (generate_series(1, 6) * INTERVAL '2 weeks'))::DATE,
    NEW.created_by
  FROM generate_series(1, 6);
  
  -- Create salary checks on 5th of first 3 months
  INSERT INTO placement_followups (placement_id, followup_type, due_date, created_by)
  SELECT 
    NEW.id,
    'salary',
    (DATE_TRUNC('month', NEW.placement_date + (generate_series(1, 3) * INTERVAL '1 month')) + INTERVAL '4 days')::DATE,
    NEW.created_by
  FROM generate_series(1, 3);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;