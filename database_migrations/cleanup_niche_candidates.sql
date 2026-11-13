-- Cleanup NICHE candidates outside Feb 1 - Mar 26, 2026 range
-- This will remove old candidates (including the 517+ orphaned ones) and keep current data

-- ANALYSIS FIRST - Run this to see what will be affected
SELECT 'BEFORE CLEANUP - Current State' as phase;

-- Total counts
SELECT 
  'Current totals' as info,
  COUNT(*) as total_candidates,
  COUNT(CASE WHEN inquiry_date >= '2026-02-01' AND inquiry_date <= '2026-03-26' THEN 1 END) as candidates_to_keep,
  COUNT(CASE WHEN inquiry_date < '2026-02-01' OR inquiry_date > '2026-03-26' OR inquiry_date IS NULL THEN 1 END) as candidates_to_delete
FROM niche_candidates;

-- Breakdown by action
SELECT 
  CASE 
    WHEN inquiry_date >= '2026-02-01' AND inquiry_date <= '2026-03-26' THEN 'KEEP - Feb-Mar 2026'
    WHEN inquiry_date IS NULL THEN 'DELETE - NULL inquiry_date'
    ELSE 'DELETE - Outside date range'
  END as action,
  COUNT(*) as candidate_count
FROM niche_candidates
GROUP BY CASE 
  WHEN inquiry_date >= '2026-02-01' AND inquiry_date <= '2026-03-26' THEN 'KEEP - Feb-Mar 2026'
  WHEN inquiry_date IS NULL THEN 'DELETE - NULL inquiry_date'
  ELSE 'DELETE - Outside date range'
END
ORDER BY action;

-- Show what will be kept (should match your current interview data)
SELECT 
  'Candidates to KEEP' as info,
  TO_CHAR(inquiry_date, 'YYYY-MM-DD') as inquiry_date,
  status,
  COUNT(*) as count
FROM niche_candidates
WHERE inquiry_date >= '2026-02-01' AND inquiry_date <= '2026-03-26'
GROUP BY TO_CHAR(inquiry_date, 'YYYY-MM-DD'), status
ORDER BY inquiry_date;

-- UNCOMMENT THE SECTION BELOW TO EXECUTE THE CLEANUP
-- WARNING: This will permanently delete candidates outside Feb 1 - Mar 26, 2026
-- This includes candidates with NULL inquiry_date

/*
BEGIN;

-- Show final confirmation before deletion
SELECT 
  'ABOUT TO DELETE' as warning,
  COUNT(*) as candidates_to_delete,
  COUNT(CASE WHEN inquiry_date IS NULL THEN 1 END) as null_date_candidates,
  COUNT(CASE WHEN inquiry_date < '2026-02-01' THEN 1 END) as before_feb_2026,
  COUNT(CASE WHEN inquiry_date > '2026-03-26' THEN 1 END) as after_mar_26
FROM niche_candidates
WHERE inquiry_date < '2026-02-01'::date 
   OR inquiry_date > '2026-03-26'::date
   OR inquiry_date IS NULL;

-- Execute the deletion
-- This will CASCADE delete related interviews and notes automatically
DELETE FROM niche_candidates
WHERE inquiry_date < '2026-02-01'::date 
   OR inquiry_date > '2026-03-26'::date
   OR inquiry_date IS NULL;

-- Show results after cleanup
SELECT 'AFTER CLEANUP - Final State' as phase;

SELECT 
  'Final results' as info,
  MIN(inquiry_date) as earliest_inquiry,
  MAX(inquiry_date) as latest_inquiry,
  COUNT(*) as total_candidates_remaining
FROM niche_candidates;

-- Show remaining candidates by date and status
SELECT 
  TO_CHAR(inquiry_date, 'YYYY-MM-DD') as inquiry_date,
  status,
  COUNT(*) as count
FROM niche_candidates
GROUP BY TO_CHAR(inquiry_date, 'YYYY-MM-DD'), status
ORDER BY inquiry_date;

-- Verify no orphaned candidates remain
SELECT 
  'Orphaned check after cleanup' as info,
  COUNT(DISTINCT nc.id) as candidates_without_interviews
FROM niche_candidates nc
LEFT JOIN niche_interviews ni ON nc.id = ni.niche_candidate_id
WHERE ni.niche_candidate_id IS NULL;

COMMIT;
*/

-- To execute: Uncomment the section above and run this script