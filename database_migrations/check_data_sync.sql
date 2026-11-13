-- Check for people in niche_training but NOT in niche_candidates
-- Run this in Supabase SQL Editor

-- Find trainees not in candidates
SELECT 
  nt.name,
  nt.phone,
  nt.status as training_status,
  'Not in candidates' as issue
FROM niche_training nt
WHERE NOT EXISTS (
  SELECT 1 FROM niche_candidates nc
  WHERE normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
)
ORDER BY nt.name;

-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%blacklist%';

-- Check employment status values
SELECT 
  employment_status,
  COUNT(*) as count
FROM newstaff_members
GROUP BY employment_status
ORDER BY count DESC;
