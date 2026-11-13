-- Fix cohort 21 dates - should come AFTER cohort 20

BEGIN;

-- Show current dates
SELECT 
  'BEFORE FIX' as info,
  cohort_number,
  start_date,
  end_date
FROM niche_cohorts
WHERE cohort_number IN (20, 21, 22)
ORDER BY cohort_number;

-- Update cohort 21 to start after cohort 20 ends
-- Cohort 20 ends Nov 22, so Cohort 21 should start Nov 23
UPDATE niche_cohorts
SET 
  start_date = '2026-11-23',
  end_date = '2026-12-06'
WHERE cohort_number = 21;

-- Verify the fix
SELECT 
  'AFTER FIX' as info,
  cohort_number,
  start_date,
  end_date,
  status
FROM niche_cohorts
WHERE cohort_number IN (20, 21, 22)
ORDER BY cohort_number;

COMMIT;
