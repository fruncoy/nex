-- Find which short course trainee is missing from candidates

-- Show all short course trainees and their matching candidates
SELECT 
  'Short courses - candidate match check' as info,
  nt.name,
  nt.phone as training_phone,
  nt.status as training_status,
  nc.id as candidate_id,
  nc.name as candidate_name,
  nc.phone as candidate_phone,
  nc.status as candidate_status,
  CASE 
    WHEN nc.id IS NULL THEN 'MISSING CANDIDATE RECORD'
    ELSE 'HAS CANDIDATE'
  END as match_status
FROM niche_training nt
LEFT JOIN niche_candidates nc ON 
  REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g')
WHERE nt.training_type = 'shortcourse'
ORDER BY nc.id NULLS LAST, nt.name;

-- Count the mismatch
SELECT 
  'Short courses without candidates' as issue,
  COUNT(*) as count
FROM niche_training nt
LEFT JOIN niche_candidates nc ON 
  REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g')
WHERE nt.training_type = 'shortcourse'
  AND nc.id IS NULL;
