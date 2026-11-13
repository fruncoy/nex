-- Clean up NICHE interviews outside February 2026 to March 26, 2026 range
-- Based on your data, this will remove interviews from Aug 2025 - Jan 2026

-- 1. Current overview
SELECT 
  'Current Data Overview' as info,
  MIN(date_time) as earliest_interview,
  MAX(date_time) as latest_interview,
  COUNT(*) as total_interviews
FROM niche_interviews;

-- 2. Count by month (to see what will be removed)
SELECT 
  TO_CHAR(date_time, 'YYYY-MM') as month,
  COUNT(*) as interview_count,
  CASE 
    WHEN date_time >= '2026-02-01' AND date_time <= '2026-03-26' THEN 'KEEP'
    ELSE 'DELETE'
  END as action
FROM niche_interviews
GROUP BY TO_CHAR(date_time, 'YYYY-MM'), 
         CASE WHEN date_time >= '2026-02-01' AND date_time <= '2026-03-26' THEN 'KEEP' ELSE 'DELETE' END
ORDER BY month;

-- 3. Count what will be deleted vs kept
SELECT 
  CASE 
    WHEN date_time >= '2026-02-01' AND date_time <= '2026-03-26' THEN 'KEEP (Feb-Mar 2026)'
    ELSE 'DELETE (Outside range)'
  END as action,
  COUNT(*) as count
FROM niche_interviews
GROUP BY CASE WHEN date_time >= '2026-02-01' AND date_time <= '2026-03-26' THEN 'KEEP (Feb-Mar 2026)' ELSE 'DELETE (Outside range)' END;

-- 4. Show specific interviews that will be DELETED (outside Feb 1 - Mar 26, 2026)
SELECT 
  'Interviews to be DELETED:' as info,
  TO_CHAR(date_time, 'YYYY-MM-DD') as interview_date,
  outcome,
  COUNT(*) as count
FROM niche_interviews
WHERE date_time < '2026-02-01' OR date_time > '2026-03-26'
GROUP BY TO_CHAR(date_time, 'YYYY-MM-DD'), outcome
ORDER BY interview_date;

-- 5. Show what will be KEPT (Feb 1 - Mar 26, 2026)
SELECT 
  'Interviews to be KEPT:' as info,
  TO_CHAR(date_time, 'YYYY-MM-DD') as interview_date,
  outcome,
  COUNT(*) as count
FROM niche_interviews
WHERE date_time >= '2026-02-01' AND date_time <= '2026-03-26'
GROUP BY TO_CHAR(date_time, 'YYYY-MM-DD'), outcome
ORDER BY interview_date;

-- UNCOMMENT THE SECTION BELOW TO ACTUALLY DELETE THE DATA
-- WARNING: This will permanently delete ALL interviews before Feb 1, 2026 and after Mar 26, 2026

/*
BEGIN;

-- Delete interviews outside the Feb 1 - Mar 26, 2026 range
DELETE FROM niche_interviews
WHERE date_time < '2026-02-01'::date 
   OR date_time > '2026-03-26'::date;

-- Show what remains after cleanup
SELECT 
  'After Cleanup - Final Count' as info,
  MIN(date_time) as earliest_interview,
  MAX(date_time) as latest_interview,
  COUNT(*) as total_interviews_remaining
FROM niche_interviews;

-- Show remaining interviews by date
SELECT 
  TO_CHAR(date_time, 'YYYY-MM-DD') as interview_date,
  COUNT(*) as count
FROM niche_interviews
GROUP BY TO_CHAR(date_time, 'YYYY-MM-DD')
ORDER BY interview_date;

COMMIT;
*/