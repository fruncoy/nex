-- Fix training statuses based on training type
-- 2-Week Flagship: Active, Graduated, Expelled
-- Short Course: Active, Completed

-- First, check what we have
SELECT 
  'Current status distribution' as info,
  nt.training_type,
  nt.status,
  COUNT(*) as count
FROM niche_training nt
GROUP BY nt.training_type, nt.status
ORDER BY nt.training_type, nt.status;

-- Check cohort 17 and below - who should be expelled?
SELECT 
  'Non-graduated from old cohorts' as info,
  nc.cohort_number,
  nt.name,
  nt.status as current_status,
  nt.training_type,
  CASE 
    WHEN LOWER(nt.name) LIKE '%jentix%' THEN 'KEEP - Jentix exception'
    WHEN nc.cohort_number <= 17 AND nt.status != 'Graduated' THEN 'SHOULD BE EXPELLED'
    ELSE 'OK'
  END as action_needed
FROM niche_training nt
JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nc.cohort_number <= 17
  AND nt.status != 'Graduated'
ORDER BY nc.cohort_number, nt.name;

-- Update: For 2-week flagship cohorts 17 and below, mark non-graduated as Expelled (except Jentix)
-- First show what will be changed
SELECT 
  'Will update to Expelled' as action,
  nt.name,
  nc.cohort_number,
  nt.status as old_status,
  'Expelled' as new_status
FROM niche_training nt
JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nc.cohort_number <= 17
  AND nt.status NOT IN ('Graduated', 'Expelled')
  AND (nt.training_type IS NULL OR nt.training_type != 'shortcourse')
  AND LOWER(nt.name) NOT LIKE '%jentix%';

-- The actual update (commented out for safety - uncomment to run)
/*
UPDATE niche_training nt
SET status = 'Expelled'
FROM niche_cohorts nc
WHERE nt.cohort_id = nc.id
  AND nc.cohort_number <= 17
  AND nt.status NOT IN ('Graduated', 'Expelled')
  AND (nt.training_type IS NULL OR nt.training_type != 'shortcourse')
  AND LOWER(nt.name) NOT LIKE '%jentix%';
*/

-- After update, sync candidate statuses
-- Show candidates that need to be blacklisted
SELECT 
  'Candidates to blacklist' as action,
  nc.name,
  nc.phone,
  nc.status as current_status,
  'BLACKLISTED' as new_status
FROM niche_candidates nc
INNER JOIN niche_training nt ON 
  REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g')
INNER JOIN niche_cohorts coh ON nt.cohort_id = coh.id
WHERE nt.status = 'Expelled'
  AND nc.status != 'BLACKLISTED';

-- Update candidates (commented out for safety - uncomment to run)
/*
UPDATE niche_candidates nc
SET status = 'BLACKLISTED'
FROM niche_training nt
INNER JOIN niche_cohorts coh ON nt.cohort_id = coh.id
WHERE REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g')
  AND nt.status = 'Expelled'
  AND nc.status != 'BLACKLISTED';
*/
