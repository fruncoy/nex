-- Check if blacklisted candidates exist in newstaff_members
SELECT
  nc.name,
  nc.phone as candidate_phone,
  nc.status,
  sm.phone as staff_phone,
  sm.employment_status
FROM niche_candidates nc
LEFT JOIN newstaff_members sm ON normalize_phone_niche(nc.phone) = normalize_phone_niche(sm.phone)
WHERE nc.status = 'BLACKLISTED'
ORDER BY nc.name
LIMIT 30;
