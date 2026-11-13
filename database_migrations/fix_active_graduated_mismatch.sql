-- Fix the one mismatch: Active training → Graduated candidate
-- Should be: Active training → Active in Training candidate

-- Find and fix the mismatch
UPDATE niche_candidates nc
SET status = 'Active in Training'
FROM niche_training nt
WHERE nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
  AND nt.status = 'Active'
  AND nc.status = 'Graduated';

-- Show the fix
SELECT 
  'FIXED MISMATCH' as result,
  nc.name,
  nc.phone,
  nc.status as candidate_status,
  nt.status as training_status
FROM niche_candidates nc
INNER JOIN niche_training nt ON nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
WHERE nt.status = 'Active' AND nc.status = 'Active in Training';