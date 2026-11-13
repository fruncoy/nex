-- Fix candidates who are marked as "Graduated" but should be "BLACKLISTED"
-- because they were Expelled from training

-- First, check the problem
SELECT 
  'PROBLEM: Graduated candidates who were actually expelled' as issue,
  nc.name,
  nc.phone,
  nc.status as candidate_status,
  nt.status as training_status
FROM niche_candidates nc
INNER JOIN niche_training nt ON 
  REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g')
WHERE nc.status = 'Graduated'
  AND nt.status = 'Expelled'
ORDER BY nc.name;

-- Fix the problem
UPDATE niche_candidates nc
SET status = 'BLACKLISTED'
FROM niche_training nt
WHERE REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g')
  AND nc.status = 'Graduated'
  AND nt.status = 'Expelled';

-- Verify the fix
SELECT 
  'VERIFICATION: Expelled trainees now blacklisted' as check_type,
  COUNT(*) as count
FROM niche_candidates nc
INNER JOIN niche_training nt ON 
  REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g')
WHERE nc.status = 'BLACKLISTED'
  AND nt.status = 'Expelled';
