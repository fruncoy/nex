-- Fix cohort dates to 2025 instead of 2026
-- Update cohorts to correct 2025 dates

UPDATE niche_cohorts SET 
  start_date = '2025-02-03', 
  end_date = '2025-02-16' 
WHERE cohort_number = 1;

UPDATE niche_cohorts SET 
  start_date = '2025-02-17', 
  end_date = '2025-03-02' 
WHERE cohort_number = 2;

UPDATE niche_cohorts SET 
  start_date = '2025-03-03', 
  end_date = '2025-03-16' 
WHERE cohort_number = 3;

UPDATE niche_cohorts SET 
  start_date = '2025-03-17', 
  end_date = '2025-03-30' 
WHERE cohort_number = 4;

UPDATE niche_cohorts SET 
  start_date = '2025-03-31', 
  end_date = '2025-04-13' 
WHERE cohort_number = 5;

-- Auto-update cohort statuses based on current date (March 8, 2025)
UPDATE niche_cohorts SET status = 
  CASE 
    WHEN end_date < CURRENT_DATE THEN 'completed'
    WHEN start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE THEN 'active'
    ELSE 'upcoming'
  END;