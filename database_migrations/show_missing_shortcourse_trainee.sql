-- Show the specific person who is missing

SELECT 
  'MISSING CANDIDATE' as issue,
  nt.id,
  nt.name,
  nt.phone,
  nt.status,
  nt.training_type,
  nt.created_at
FROM niche_training nt
LEFT JOIN niche_candidates nc ON 
  REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g')
WHERE nt.training_type = 'shortcourse'
  AND nc.id IS NULL;
