-- FINAL FIX: All short courses should use "Completed" status
-- Short courses use: Active, Completed
-- 2-week flagship uses: Active, Graduated, Expelled

BEGIN;

-- Show current problem
SELECT 
  'BEFORE FIX - Short courses with wrong status' as info,
  name,
  status,
  training_type
FROM niche_training
WHERE training_type = 'shortcourse'
  AND status IN ('Graduated', 'Expelled')
ORDER BY name;

-- Fix 1: Change all short course "Graduated" to "Completed"
UPDATE niche_training
SET status = 'Completed'
WHERE training_type = 'shortcourse'
  AND status = 'Graduated';

-- Fix 2: Change all short course "Expelled" to "Completed"
UPDATE niche_training
SET status = 'Completed'
WHERE training_type = 'shortcourse'
  AND status = 'Expelled';

-- Update candidates table - sync short course status
-- Short course "Completed" → candidate "Completed" (NOT "Graduated")
UPDATE niche_candidates nc
SET status = 'Completed'
FROM niche_training nt
WHERE REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g')
  AND nt.training_type = 'shortcourse'
  AND nt.status = 'Completed'
  AND nc.status != 'Completed';

-- Show fixed results
SELECT 
  'AFTER FIX - All short courses' as info,
  status,
  COUNT(*) as count
FROM niche_training
WHERE training_type = 'shortcourse'
GROUP BY status
ORDER BY status;

-- Show all short courses
SELECT 
  'All short courses final' as info,
  name,
  status,
  training_type
FROM niche_training
WHERE training_type = 'shortcourse'
ORDER BY name;

-- Verify candidates updated
SELECT 
  'Candidates with Completed status' as info,
  COUNT(*) as count
FROM niche_candidates
WHERE status = 'Completed';

-- Summary
SELECT 
  'SUMMARY' as report,
  (SELECT COUNT(*) FROM niche_training WHERE training_type = 'shortcourse') as total_short_courses,
  (SELECT COUNT(*) FROM niche_training WHERE training_type = 'shortcourse' AND status = 'Completed') as completed_short_courses,
  (SELECT COUNT(*) FROM niche_candidates WHERE status = 'Completed') as completed_candidates;

COMMIT;
