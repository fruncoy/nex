-- Fix duplicate followups and recreate trigger properly

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_create_placement_followups ON placements;

-- Delete all existing followups to start fresh
DELETE FROM placement_followups;

-- Create simple trigger that creates exactly 6 followups and 3 salary checks
CREATE OR REPLACE FUNCTION create_placement_followups()
RETURNS TRIGGER AS $$
BEGIN
  -- Create exactly 6 follow-ups (2-week intervals)
  INSERT INTO placement_followups (placement_id, followup_type, due_date, created_by)
  VALUES 
    (NEW.id, '2_week', NEW.placement_date + INTERVAL '2 weeks', NEW.created_by),
    (NEW.id, '2_week', NEW.placement_date + INTERVAL '4 weeks', NEW.created_by),
    (NEW.id, '2_week', NEW.placement_date + INTERVAL '6 weeks', NEW.created_by),
    (NEW.id, '2_week', NEW.placement_date + INTERVAL '8 weeks', NEW.created_by),
    (NEW.id, '2_week', NEW.placement_date + INTERVAL '10 weeks', NEW.created_by),
    (NEW.id, '2_week', NEW.placement_date + INTERVAL '12 weeks', NEW.created_by);
  
  -- Create exactly 3 salary checks (5th of each month)
  INSERT INTO placement_followups (placement_id, followup_type, due_date, created_by)
  VALUES 
    (NEW.id, 'salary', DATE_TRUNC('month', NEW.placement_date + INTERVAL '1 month') + INTERVAL '4 days', NEW.created_by),
    (NEW.id, 'salary', DATE_TRUNC('month', NEW.placement_date + INTERVAL '2 months') + INTERVAL '4 days', NEW.created_by),
    (NEW.id, 'salary', DATE_TRUNC('month', NEW.placement_date + INTERVAL '3 months') + INTERVAL '4 days', NEW.created_by);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_create_placement_followups
    AFTER INSERT ON placements
    FOR EACH ROW
    EXECUTE FUNCTION create_placement_followups();

-- Recreate followups for existing placements
INSERT INTO placement_followups (placement_id, followup_type, due_date, created_by)
SELECT 
  p.id,
  '2_week',
  p.placement_date + (weeks.week_num * INTERVAL '2 weeks'),
  p.created_by
FROM placements p
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6)) AS weeks(week_num)
WHERE p.status = 'ACTIVE';

INSERT INTO placement_followups (placement_id, followup_type, due_date, created_by)
SELECT 
  p.id,
  'salary',
  DATE_TRUNC('month', p.placement_date + (months.month_num * INTERVAL '1 month')) + INTERVAL '4 days',
  p.created_by
FROM placements p
CROSS JOIN (VALUES (1), (2), (3)) AS months(month_num)
WHERE p.status = 'ACTIVE';