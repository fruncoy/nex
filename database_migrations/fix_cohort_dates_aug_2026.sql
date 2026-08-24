-- Fix cohort dates for Cohort 13, 14, 15 based on actual dates
-- Cohort 13: 27th July 2026 to 9th August 2026 (14 days)
-- Cohort 14: 10th August 2026 to 23rd August 2026 (14 days)
-- Cohort 15: 31st August 2026 to 13th September 2026 (14 days)

-- Add training_type column to niche_cohorts if not exists (for Bread/Short courses support)
ALTER TABLE niche_cohorts ADD COLUMN IF NOT EXISTS training_type TEXT DEFAULT '2week' CHECK (training_type IN ('2week', 'shortcourse', 'weekend', 'bread'));

-- Update the specific cohorts with actual correct dates
UPDATE niche_cohorts SET start_date = '2026-07-27', end_date = '2026-08-09' WHERE cohort_number = 13;
UPDATE niche_cohorts SET start_date = '2026-08-10', end_date = '2026-08-23' WHERE cohort_number = 14;
UPDATE niche_cohorts SET start_date = '2026-08-31', end_date = '2026-09-13' WHERE cohort_number = 15;

-- Cohort 16 onwards continues the pattern
-- After Cohort 15 ends 13th Sept, there's a 1-week gap before Cohort 16 per your pattern
-- If you need cohort 16, 17 etc., adjust here or use the UI manager
UPDATE niche_cohorts SET start_date = '2026-09-14', end_date = '2026-09-27' WHERE cohort_number = 16;
UPDATE niche_cohorts SET start_date = '2026-09-28', end_date = '2026-10-11' WHERE cohort_number = 17;
UPDATE niche_cohorts SET start_date = '2026-10-12', end_date = '2026-10-25' WHERE cohort_number = 18;
UPDATE niche_cohorts SET start_date = '2026-10-26', end_date = '2026-11-08' WHERE cohort_number = 19;
UPDATE niche_cohorts SET start_date = '2026-11-09', end_date = '2026-11-22' WHERE cohort_number = 20;

-- Recalculate all statuses based on CURRENT_DATE (today is 24th Aug 2026)
-- Cohort 13: 27 Jul - 9 Aug → ENDED → completed
-- Cohort 14: 10 Aug - 23 Aug → ENDED → completed (24th Aug is after)
-- Cohort 15: 31 Aug - 13 Sep → not started → upcoming
-- So we need to allow the system to correctly mark things!

UPDATE niche_cohorts 
SET status = CASE 
  WHEN end_date < CURRENT_DATE THEN 'completed'
  WHEN start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE THEN 'active'
  ELSE 'upcoming'
END;

-- Verify the changes
SELECT 
  cohort_number, 
  training_type,
  start_date, 
  end_date, 
  status,
  (end_date - start_date + 1) AS days_duration,
  CASE 
    WHEN end_date < CURRENT_DATE THEN 'Past'
    WHEN start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE THEN 'RIGHT NOW'
    ELSE 'Future'
  END AS reality_check
FROM niche_cohorts
WHERE cohort_number BETWEEN 10 AND 20
ORDER BY cohort_number;
