-- Check if ALL candidates in niche_training exist in niche_candidates
-- This should return 0 if everyone exists

SELECT 
  nt.id,
  nt.name,
  nt.phone,
  nt.status as training_status,
  'MISSING FROM CANDIDATES' as issue
FROM niche_training nt
WHERE nt.phone IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM niche_candidates nc
    WHERE normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
  )
ORDER BY nt.name;

-- Count total in training vs candidates
SELECT 
  'niche_training' as table_name,
  COUNT(*) as total_count
FROM niche_training
UNION ALL
SELECT 
  'niche_candidates' as table_name,
  COUNT(*) as total_count
FROM niche_candidates;
