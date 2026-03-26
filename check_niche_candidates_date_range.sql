-- Check NICHE candidates table date range
-- Analyze inquiry_date, scheduled_date, and created_at fields

-- 1. Overview of date ranges in niche_candidates
SELECT 
  'NICHE Candidates Overview' as info,
  MIN(inquiry_date) as earliest_inquiry,
  MAX(inquiry_date) as latest_inquiry,
  MIN(scheduled_date) as earliest_scheduled,
  MAX(scheduled_date) as latest_scheduled,
  MIN(created_at) as earliest_created,
  MAX(created_at) as latest_created,
  COUNT(*) as total_candidates
FROM niche_candidates;

-- 2. Count by inquiry_date month
SELECT 
  TO_CHAR(inquiry_date, 'YYYY-MM') as inquiry_month,
  COUNT(*) as candidate_count,
  CASE 
    WHEN inquiry_date >= '2026-02-01' AND inquiry_date <= '2026-03-26' THEN 'KEEP'
    ELSE 'DELETE'
  END as action
FROM niche_candidates
WHERE inquiry_date IS NOT NULL
GROUP BY TO_CHAR(inquiry_date, 'YYYY-MM'), 
         CASE WHEN inquiry_date >= '2026-02-01' AND inquiry_date <= '2026-03-26' THEN 'KEEP' ELSE 'DELETE' END
ORDER BY inquiry_month;

-- 3. Count by created_at month (when record was added to system)
SELECT 
  TO_CHAR(created_at, 'YYYY-MM') as created_month,
  COUNT(*) as candidate_count,
  CASE 
    WHEN created_at >= '2026-02-01' AND created_at <= '2026-03-26' THEN 'KEEP'
    ELSE 'DELETE'
  END as action
FROM niche_candidates
WHERE created_at IS NOT NULL
GROUP BY TO_CHAR(created_at, 'YYYY-MM'), 
         CASE WHEN created_at >= '2026-02-01' AND created_at <= '2026-03-26' THEN 'KEEP' ELSE 'DELETE' END
ORDER BY created_month;

-- 4. Summary: What would be deleted vs kept (based on inquiry_date)
SELECT 
  CASE 
    WHEN inquiry_date >= '2026-02-01' AND inquiry_date <= '2026-03-26' THEN 'KEEP (Feb-Mar 2026)'
    WHEN inquiry_date IS NULL THEN 'NULL inquiry_date'
    ELSE 'DELETE (Outside range)'
  END as action,
  COUNT(*) as count
FROM niche_candidates
GROUP BY CASE 
  WHEN inquiry_date >= '2026-02-01' AND inquiry_date <= '2026-03-26' THEN 'KEEP (Feb-Mar 2026)'
  WHEN inquiry_date IS NULL THEN 'NULL inquiry_date'
  ELSE 'DELETE (Outside range)'
END;

-- 5. Show candidates that would be DELETED (outside Feb 1 - Mar 26, 2026)
SELECT 
  'Candidates to be DELETED:' as info,
  TO_CHAR(inquiry_date, 'YYYY-MM-DD') as inquiry_date,
  status,
  COUNT(*) as count
FROM niche_candidates
WHERE inquiry_date < '2026-02-01' OR inquiry_date > '2026-03-26' OR inquiry_date IS NULL
GROUP BY TO_CHAR(inquiry_date, 'YYYY-MM-DD'), status
ORDER BY inquiry_date;

-- 6. Show candidates that would be KEPT (Feb 1 - Mar 26, 2026)
SELECT 
  'Candidates to be KEPT:' as info,
  TO_CHAR(inquiry_date, 'YYYY-MM-DD') as inquiry_date,
  status,
  COUNT(*) as count
FROM niche_candidates
WHERE inquiry_date >= '2026-02-01' AND inquiry_date <= '2026-03-26'
GROUP BY TO_CHAR(inquiry_date, 'YYYY-MM-DD'), status
ORDER BY inquiry_date;

-- 7. Check for orphaned candidates (candidates without interviews)
SELECT 
  'Orphaned Candidates Check' as info,
  COUNT(DISTINCT nc.id) as candidates_without_interviews
FROM niche_candidates nc
LEFT JOIN niche_interviews ni ON nc.id = ni.niche_candidate_id
WHERE ni.niche_candidate_id IS NULL;

-- UNCOMMENT BELOW TO DELETE CANDIDATES OUTSIDE THE DATE RANGE
-- WARNING: This will also delete related interviews and notes due to CASCADE

/*
BEGIN;

-- Show what we're about to delete
SELECT 
  'About to delete candidates' as action,
  COUNT(*) as candidates_to_delete
FROM niche_candidates
WHERE inquiry_date < '2026-02-01'::date 
   OR inquiry_date > '2026-03-26'::date
   OR inquiry_date IS NULL;

-- Delete candidates outside the date range
DELETE FROM niche_candidates
WHERE inquiry_date < '2026-02-01'::date 
   OR inquiry_date > '2026-03-26'::date
   OR inquiry_date IS NULL;

-- Show final results
SELECT 
  'Cleanup Complete' as status,
  MIN(inquiry_date) as earliest_inquiry,
  MAX(inquiry_date) as latest_inquiry,
  COUNT(*) as total_candidates_remaining
FROM niche_candidates;

COMMIT;
*/