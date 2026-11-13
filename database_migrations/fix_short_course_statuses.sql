-- FIX: All short courses should use "Completed" status, not "Graduated"
-- Short courses: Active, Completed
-- 2-week flagship: Active, Graduated, Expelled

BEGIN;

-- Show current short course statuses
SELECT 
  'Current short course statuses' as info,
  name,
  status,
  training_type
FROM niche_training
WHERE training_type = 'shortcourse'
ORDER BY status, name;

-- Update ALL short courses from "Graduated" to "Completed"
UPDATE niche_training
SET status = 'Completed'
WHERE training_type = 'shortcourse'
  AND status = 'Graduated';

-- Update Sarafina Kamau from "Expelled" to "Completed" (she's short course!)
UPDATE niche_training
SET status = 'Completed'
WHERE training_type = 'shortcourse'
  AND status = 'Expelled';

-- Verify the fix
SELECT 
  'After fix' as info,
  status,
  COUNT(*) as count
FROM niche_training
WHERE training_type = 'shortcourse'
GROUP BY status
ORDER BY status;

-- Show all short courses
SELECT 
  'All short courses' as info,
  name,
  status,
  training_type
FROM niche_training
WHERE training_type = 'shortcourse'
ORDER BY name;

-- Count total
SELECT 
  'Total short courses' as info,
  COUNT(*) as total
FROM niche_training
WHERE training_type = 'shortcourse';

COMMIT;
