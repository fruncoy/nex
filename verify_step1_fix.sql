-- ============================================================================
-- VERIFICATION: Test that Step 1 fixes are working correctly
-- ============================================================================

-- 1. Check employment status distribution
SELECT employment_status, COUNT(*) as count
FROM newstaff_members
GROUP BY employment_status
ORDER BY count DESC;

-- 2. Check if all training records have corresponding candidates
SELECT 
  'Training records without candidates' as issue,
  COUNT(*) as count
FROM niche_training nt
WHERE NOT EXISTS (
  SELECT 1 FROM niche_candidates nc
  WHERE normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
);

-- 3. Check if triggers exist
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%sync%'
ORDER BY event_object_table;

-- 4. Check for incorrectly expelled (graduated people who were blacklisted)
-- This should return 0 if the fix worked
SELECT 
  nt.name,
  nt.phone,
  nt.status as training_status,
  nc.status as candidate_status,
  sm.employment_status as staff_status
FROM niche_training nt
JOIN niche_candidates nc ON normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
LEFT JOIN newstaff_members sm ON normalize_phone_niche(sm.phone) = normalize_phone_niche(nt.phone)
WHERE nc.status = 'BLACKLISTED'
  AND nt.status = 'Expelled'
  AND sm.employment_status = 'Blacklisted';

-- 5. Test: Pick a "Yet to be Employed" staff member and check their status across tables
SELECT 
  sm.name,
  sm.phone,
  sm.employment_status as staff_status,
  nc.status as candidate_status,
  nt.status as training_status
FROM newstaff_members sm
LEFT JOIN niche_candidates nc ON normalize_phone_niche(nc.phone) = normalize_phone_niche(sm.phone)
LEFT JOIN niche_training nt ON normalize_phone_niche(nt.phone) = normalize_phone_niche(sm.phone)
WHERE sm.employment_status = 'Yet to be Employed'
LIMIT 5;
