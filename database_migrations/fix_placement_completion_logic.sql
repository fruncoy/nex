-- Fix placement completion logic to check for all 9 followups (6 + 3)

-- Update the completion check function to require only 6 followups
CREATE OR REPLACE FUNCTION check_placement_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if all 6 followups for this placement are completed (only 2_week type)
  IF (
    SELECT COUNT(*) FROM placement_followups 
    WHERE placement_id = NEW.placement_id 
    AND followup_type = '2_week'
    AND completed_date IS NOT NULL
  ) = 6 THEN
    -- Mark placement as SUCCESS only if all 6 followups are completed
    UPDATE placements 
    SET status = 'SUCCESS', updated_at = NOW()
    WHERE id = NEW.placement_id AND status = 'ACTIVE';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing placements to SUCCESS if they have all 6 followups completed
UPDATE placements 
SET status = 'SUCCESS', updated_at = NOW()
WHERE status = 'ACTIVE' 
AND id IN (
  SELECT placement_id 
  FROM placement_followups 
  WHERE followup_type = '2_week'
  AND completed_date IS NOT NULL
  GROUP BY placement_id 
  HAVING COUNT(*) = 6
);

-- Ensure all active placements have exactly 9 followups
INSERT INTO placement_followups (placement_id, followup_type, due_date, created_by)
SELECT 
  p.id,
  '2_week',
  p.placement_date + (weeks.week_num * INTERVAL '2 weeks'),
  p.created_by
FROM placements p
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6)) AS weeks(week_num)
WHERE p.status IN ('ACTIVE', 'SUCCESS', 'LOST')
AND NOT EXISTS (
  SELECT 1 FROM placement_followups pf 
  WHERE pf.placement_id = p.id 
  AND pf.followup_type = '2_week'
  AND pf.due_date = p.placement_date + (weeks.week_num * INTERVAL '2 weeks')
);

INSERT INTO placement_followups (placement_id, followup_type, due_date, created_by)
SELECT 
  p.id,
  'salary',
  DATE_TRUNC('month', p.placement_date + (months.month_num * INTERVAL '1 month')) + INTERVAL '4 days',
  p.created_by
FROM placements p
CROSS JOIN (VALUES (1), (2), (3)) AS months(month_num)
WHERE p.status IN ('ACTIVE', 'SUCCESS', 'LOST')
AND NOT EXISTS (
  SELECT 1 FROM placement_followups pf 
  WHERE pf.placement_id = p.id 
  AND pf.followup_type = 'salary'
  AND pf.due_date = DATE_TRUNC('month', p.placement_date + (months.month_num * INTERVAL '1 month')) + INTERVAL '4 days'
);