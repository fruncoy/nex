-- FINAL EXECUTION: Clean up NICHE candidates
-- This will keep 62 candidates from Feb-Mar 2026 and delete the rest

BEGIN;

-- Final confirmation - show what we're about to delete
SELECT 
  'FINAL CONFIRMATION' as action,
  COUNT(*) as total_candidates_before_cleanup,
  COUNT(CASE WHEN inquiry_date >= '2026-02-01' AND inquiry_date <= '2026-03-26' THEN 1 END) as will_keep,
  COUNT(CASE WHEN inquiry_date < '2026-02-01' OR inquiry_date > '2026-03-26' OR inquiry_date IS NULL THEN 1 END) as will_delete
FROM niche_candidates;

-- Execute the deletion
DELETE FROM niche_candidates
WHERE inquiry_date < '2026-02-01'::date 
   OR inquiry_date > '2026-03-26'::date
   OR inquiry_date IS NULL;

-- Show final results
SELECT 
  'CLEANUP COMPLETED' as status,
  COUNT(*) as total_candidates_remaining,
  MIN(inquiry_date) as earliest_inquiry_date,
  MAX(inquiry_date) as latest_inquiry_date
FROM niche_candidates;

-- Show final candidate distribution
SELECT 
  TO_CHAR(inquiry_date, 'YYYY-MM-DD') as inquiry_date,
  status,
  COUNT(*) as count
FROM niche_candidates
GROUP BY TO_CHAR(inquiry_date, 'YYYY-MM-DD'), status
ORDER BY inquiry_date, status;

-- Verify orphaned candidates are gone
SELECT 
  'Orphaned candidates after cleanup' as check_result,
  COUNT(DISTINCT nc.id) as candidates_without_interviews
FROM niche_candidates nc
LEFT JOIN niche_interviews ni ON nc.id = ni.niche_candidate_id
WHERE ni.niche_candidate_id IS NULL;

-- Final summary
SELECT 
  'FINAL SUMMARY' as summary,
  (SELECT COUNT(*) FROM niche_candidates) as total_candidates,
  (SELECT COUNT(*) FROM niche_interviews) as total_interviews,
  (SELECT COUNT(DISTINCT niche_candidate_id) FROM niche_interviews) as candidates_with_interviews
FROM niche_candidates
LIMIT 1;

COMMIT;