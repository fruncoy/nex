-- Fix mismatched statuses between niche_training and niche_candidates
-- If someone is Graduated/Completed in training, they should be Graduated in candidates

-- Update candidates who are graduated/completed in training but not in candidates
UPDATE niche_candidates nc
SET status = 'Graduated'
FROM niche_training nt
WHERE normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
  AND nt.status IN ('Graduated', 'Completed')
  AND nc.status NOT IN ('Graduated', 'BLACKLISTED')
  AND nc.status != 'Graduated';

-- Check results: Show any remaining mismatches
SELECT 
  nt.name,
  nt.phone,
  nt.status as training_status,
  nc.status as candidate_status,
  CASE 
    WHEN nt.status = 'Graduated' AND nc.status != 'Graduated' THEN 'MISMATCH'
    WHEN nt.status = 'Completed' AND nc.status != 'Graduated' THEN 'MISMATCH'
    ELSE 'OK'
  END as status_check
FROM niche_training nt
JOIN niche_candidates nc ON normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
WHERE nt.status IN ('Graduated', 'Completed')
  AND nc.status != 'Graduated'
ORDER BY nt.name;
