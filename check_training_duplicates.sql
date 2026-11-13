-- Check for duplicate records in niche_training
SELECT 
  'DUPLICATES in niche_training' as issue,
  name,
  phone,
  COUNT(*) as duplicate_count,
  array_agg(DISTINCT id) as record_ids
FROM niche_training
WHERE phone IS NOT NULL
GROUP BY name, phone
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, name;

-- Show the specific duplicate records
SELECT 
  'Duplicate details' as info,
  id,
  name,
  phone,
  status,
  cohort_id,
  created_at
FROM niche_training
WHERE phone IN (
  SELECT phone
  FROM niche_training
  WHERE phone IS NOT NULL
  GROUP BY phone
  HAVING COUNT(*) > 1
)
ORDER BY phone, created_at;
