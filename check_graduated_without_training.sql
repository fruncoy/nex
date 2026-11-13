-- Check candidates marked as "Graduated" who have no training record at all
SELECT 
  'Candidates marked Graduated but NOT in training' as issue,
  nc.name,
  nc.phone,
  nc.status,
  nc.created_at
FROM niche_candidates nc
WHERE nc.status = 'Graduated'
  AND NOT EXISTS (
    SELECT 1 FROM niche_training nt
    WHERE REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g')
  )
ORDER BY nc.created_at DESC;

-- Check candidates marked as "Graduated" who have training record but status is NOT Graduated
SELECT 
  'Candidates marked Graduated but training status differs' as issue,
  nc.name,
  nc.phone,
  nc.status as candidate_status,
  nt.status as actual_training_status
FROM niche_candidates nc
INNER JOIN niche_training nt ON 
  REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g')
WHERE nc.status = 'Graduated'
  AND nt.status != 'Graduated'
ORDER BY nc.name;
