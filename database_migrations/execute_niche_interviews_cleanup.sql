-- Final cleanup: Delete NICHE interviews outside Feb 1 - Mar 26, 2026
-- This will keep 12 interviews and delete the rest

BEGIN;

-- Show what we're about to delete (for final confirmation)
SELECT 
  'About to delete' as action,
  COUNT(*) as interviews_to_delete
FROM niche_interviews
WHERE date_time < '2026-02-01'::date 
   OR date_time > '2026-03-26'::date;

-- Execute the deletion
DELETE FROM niche_interviews
WHERE date_time < '2026-02-01'::date 
   OR date_time > '2026-03-26'::date;

-- Show final results
SELECT 
  'Cleanup Complete' as status,
  MIN(date_time) as earliest_interview,
  MAX(date_time) as latest_interview,
  COUNT(*) as total_interviews_remaining
FROM niche_interviews;

-- Show remaining interviews by date
SELECT 
  TO_CHAR(date_time, 'YYYY-MM-DD') as interview_date,
  outcome,
  COUNT(*) as count
FROM niche_interviews
GROUP BY TO_CHAR(date_time, 'YYYY-MM-DD'), outcome
ORDER BY interview_date;

COMMIT;