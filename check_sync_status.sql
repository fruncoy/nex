-- Check sync status between niche_training and niche_candidates
-- Run this to see the current sync problems

-- 1. Check how many graduates in training don't have "Graduated" status in candidates
SELECT 
  'Training Graduates NOT in Candidates' as issue,
  COUNT(*) as count
FROM niche_training nt
WHERE nt.status = 'Graduated'
  AND nt.phone IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM niche_candidates nc
    WHERE nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
    AND nc.status = 'Graduated'
  );

-- 2. Show the actual mismatches
SELECT 
  nt.name as training_name,
  nt.phone as training_phone,
  nt.status as training_status,
  nc.name as candidate_name,
  nc.phone as candidate_phone,
  nc.status as candidate_status
FROM niche_training nt
LEFT JOIN niche_candidates nc ON nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
WHERE nt.status = 'Graduated'
  AND (nc.status IS NULL OR nc.status != 'Graduated')
ORDER BY nt.name
LIMIT 20;

-- 3. Check if triggers exist
SELECT 
  'Database Triggers' as check_type,
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('niche_training', 'niche_candidates')
ORDER BY event_object_table, trigger_name;
