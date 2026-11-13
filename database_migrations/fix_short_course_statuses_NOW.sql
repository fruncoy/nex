-- FIX SHORT COURSES NOW

BEGIN;

-- Update ALL short courses from "Graduated" to "Completed"
UPDATE niche_training
SET status = 'Completed'
WHERE training_type = 'shortcourse'
  AND status IN ('Graduated', 'Expelled');

-- Verify
SELECT 
  'Short Course Status Distribution' as info,
  status,
  COUNT(*) as count
FROM niche_training
WHERE training_type = 'shortcourse'
GROUP BY status;

-- Show all short courses
SELECT 
  'All Short Courses' as info,
  name,
  status
FROM niche_training
WHERE training_type = 'shortcourse'
ORDER BY name;

COMMIT;
