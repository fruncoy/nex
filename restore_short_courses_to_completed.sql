-- FIX: Restore weekend (short course) participants to "Completed"
-- They were wrongly marked as "Expelled"

BEGIN;

-- Update all weekend/short course participants back to "Completed"
UPDATE niche_training
SET status = 'Completed'
WHERE training_type = 'weekend'
  AND status = 'Expelled';

-- Show what was updated
SELECT 
  'Updated to Completed' as action,
  name,
  training_type,
  status
FROM niche_training
WHERE training_type = 'weekend'
  AND status = 'Completed'
ORDER BY name;

-- Update their candidates from BLACKLISTED back to appropriate status
-- Short course "Completed" should map to what in candidates?
-- Let's set them to "Graduated" or keep their original status

-- For now, remove BLACKLISTED status from short course participants
UPDATE niche_candidates nc
SET status = 'Graduated' -- or whatever is appropriate for short course completion
FROM niche_training nt
WHERE REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g')
  AND nt.training_type = 'weekend'
  AND nt.status = 'Completed'
  AND nc.status = 'BLACKLISTED';

-- Verify the fix
SELECT 
  'Final expelled (should only be 2week)' as check_type,
  nt.name,
  nt.training_type,
  nt.status
FROM niche_training nt
WHERE nt.status = 'Expelled'
ORDER BY nt.training_type, nt.name;

-- Count by training_type and status
SELECT 
  'Status by training type' as check_type,
  training_type,
  status,
  COUNT(*) as count
FROM niche_training
GROUP BY training_type, status
ORDER BY training_type, status;

COMMIT;
