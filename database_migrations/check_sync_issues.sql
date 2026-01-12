-- Check for candidates with INTERVIEW_SCHEDULED status but no interview record
SELECT 
  c.id,
  c.name,
  c.phone,
  c.status,
  c.scheduled_date,
  c.assigned_to,
  CASE WHEN i.id IS NULL THEN 'NO INTERVIEW RECORD' ELSE 'HAS INTERVIEW' END as interview_status
FROM candidates c
LEFT JOIN interviews i ON c.id = i.candidate_id
WHERE c.status = 'INTERVIEW_SCHEDULED'
ORDER BY c.name;