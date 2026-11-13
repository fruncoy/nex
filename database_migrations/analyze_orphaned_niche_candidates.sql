-- Detailed analysis of NICHE candidates, focusing on the 517 orphaned candidates
-- This will help us understand what data to keep vs delete

-- 1. Overall candidate statistics
SELECT 
  'Total Candidates' as category,
  COUNT(*) as count
FROM niche_candidates
UNION ALL
SELECT 
  'Candidates WITH interviews' as category,
  COUNT(DISTINCT nc.id) as count
FROM niche_candidates nc
INNER JOIN niche_interviews ni ON nc.id = ni.niche_candidate_id
UNION ALL
SELECT 
  'Candidates WITHOUT interviews (Orphaned)' as category,
  COUNT(DISTINCT nc.id) as count
FROM niche_candidates nc
LEFT JOIN niche_interviews ni ON nc.id = ni.niche_candidate_id
WHERE ni.niche_candidate_id IS NULL;

-- 2. Orphaned candidates by inquiry_date month
SELECT 
  'ORPHANED by inquiry month' as info,
  COALESCE(TO_CHAR(nc.inquiry_date, 'YYYY-MM'), 'NULL') as inquiry_month,
  COUNT(*) as orphaned_count,
  CASE 
    WHEN nc.inquiry_date >= '2026-02-01' AND nc.inquiry_date <= '2026-03-26' THEN 'KEEP'
    WHEN nc.inquiry_date IS NULL THEN 'NULL_DATE'
    ELSE 'DELETE'
  END as suggested_action
FROM niche_candidates nc
LEFT JOIN niche_interviews ni ON nc.id = ni.niche_candidate_id
WHERE ni.niche_candidate_id IS NULL
GROUP BY COALESCE(TO_CHAR(nc.inquiry_date, 'YYYY-MM'), 'NULL'),
         CASE 
           WHEN nc.inquiry_date >= '2026-02-01' AND nc.inquiry_date <= '2026-03-26' THEN 'KEEP'
           WHEN nc.inquiry_date IS NULL THEN 'NULL_DATE'
           ELSE 'DELETE'
         END
ORDER BY inquiry_month;

-- 3. Orphaned candidates by status
SELECT 
  'ORPHANED by status' as info,
  nc.status,
  COUNT(*) as orphaned_count
FROM niche_candidates nc
LEFT JOIN niche_interviews ni ON nc.id = ni.niche_candidate_id
WHERE ni.niche_candidate_id IS NULL
GROUP BY nc.status
ORDER BY orphaned_count DESC;

-- 4. Candidates WITH interviews by inquiry_date month
SELECT 
  'WITH INTERVIEWS by inquiry month' as info,
  TO_CHAR(nc.inquiry_date, 'YYYY-MM') as inquiry_month,
  COUNT(DISTINCT nc.id) as candidates_with_interviews,
  CASE 
    WHEN nc.inquiry_date >= '2026-02-01' AND nc.inquiry_date <= '2026-03-26' THEN 'KEEP'
    ELSE 'DELETE'
  END as suggested_action
FROM niche_candidates nc
INNER JOIN niche_interviews ni ON nc.id = ni.niche_candidate_id
WHERE nc.inquiry_date IS NOT NULL
GROUP BY TO_CHAR(nc.inquiry_date, 'YYYY-MM'),
         CASE 
           WHEN nc.inquiry_date >= '2026-02-01' AND nc.inquiry_date <= '2026-03-26' THEN 'KEEP'
           ELSE 'DELETE'
         END
ORDER BY inquiry_month;

-- 5. Summary of cleanup impact
SELECT 
  'CLEANUP SUMMARY' as analysis,
  CASE 
    WHEN nc.inquiry_date >= '2026-02-01' AND nc.inquiry_date <= '2026-03-26' THEN 'KEEP - Feb-Mar 2026'
    WHEN nc.inquiry_date IS NULL THEN 'DELETE - NULL inquiry_date'
    ELSE 'DELETE - Outside date range'
  END as action,
  COUNT(*) as candidate_count,
  COUNT(DISTINCT ni.id) as interview_count
FROM niche_candidates nc
LEFT JOIN niche_interviews ni ON nc.id = ni.niche_candidate_id
GROUP BY CASE 
  WHEN nc.inquiry_date >= '2026-02-01' AND nc.inquiry_date <= '2026-03-26' THEN 'KEEP - Feb-Mar 2026'
  WHEN nc.inquiry_date IS NULL THEN 'DELETE - NULL inquiry_date'
  ELSE 'DELETE - Outside date range'
END
ORDER BY action;

-- 6. Show sample of orphaned candidates with NULL inquiry_date
SELECT 
  'Sample NULL inquiry_date orphans' as info,
  nc.name,
  nc.phone,
  nc.status,
  nc.created_at,
  nc.inquiry_date
FROM niche_candidates nc
LEFT JOIN niche_interviews ni ON nc.id = ni.niche_candidate_id
WHERE ni.niche_candidate_id IS NULL 
  AND nc.inquiry_date IS NULL
ORDER BY nc.created_at DESC
LIMIT 10;

-- 7. Show sample of orphaned candidates from old dates
SELECT 
  'Sample old date orphans' as info,
  nc.name,
  nc.phone,
  nc.status,
  nc.inquiry_date,
  nc.created_at
FROM niche_candidates nc
LEFT JOIN niche_interviews ni ON nc.id = ni.niche_candidate_id
WHERE ni.niche_candidate_id IS NULL 
  AND nc.inquiry_date < '2026-02-01'
ORDER BY nc.inquiry_date DESC
LIMIT 10;