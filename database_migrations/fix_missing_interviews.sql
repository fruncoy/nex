-- Fix missing interview records for candidates marked as INTERVIEW_SCHEDULED
-- This will create interview records for candidates who have status = 'INTERVIEW_SCHEDULED' but no interview record

INSERT INTO interviews (
  candidate_id,
  date_time,
  location,
  assigned_staff,
  attended,
  outcome,
  notes
)
SELECT 
  c.id as candidate_id,
  COALESCE(c.scheduled_date, NOW() + INTERVAL '1 day') as date_time,
  'Office' as location,
  c.assigned_to as assigned_staff,
  false as attended,
  null as outcome,
  'Auto-created to fix sync issue' as notes
FROM candidates c
LEFT JOIN interviews i ON c.id = i.candidate_id
WHERE c.status = 'INTERVIEW_SCHEDULED' 
  AND i.id IS NULL;