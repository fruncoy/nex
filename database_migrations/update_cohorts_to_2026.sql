-- Update specific cohort dates to 2026 with correct Monday starts
UPDATE niche_cohorts SET start_date = '2026-02-02', end_date = '2026-02-15' WHERE cohort_number = 1;
UPDATE niche_cohorts SET start_date = '2026-02-16', end_date = '2026-03-01' WHERE cohort_number = 2;
UPDATE niche_cohorts SET start_date = '2026-03-02', end_date = '2026-03-15' WHERE cohort_number = 3;
UPDATE niche_cohorts SET start_date = '2026-03-16', end_date = '2026-03-29' WHERE cohort_number = 4;
UPDATE niche_cohorts SET start_date = '2026-03-30', end_date = '2026-04-12' WHERE cohort_number = 5;

-- Auto-update cohort statuses based on current date
UPDATE niche_cohorts SET status = 
  CASE 
    WHEN end_date < CURRENT_DATE THEN 'completed'
    WHEN start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE THEN 'active'
    ELSE 'upcoming'
  END;