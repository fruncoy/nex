-- Delete existing cohorts and recreate with correct 2026 dates
DELETE FROM niche_cohorts;

-- Insert correct 2026 cohorts
INSERT INTO niche_cohorts (cohort_number, start_date, end_date, status) VALUES
(1, '2026-02-02', '2026-02-15', 'completed'),
(2, '2026-02-16', '2026-03-01', 'active'),
(3, '2026-03-02', '2026-03-15', 'upcoming'),
(4, '2026-03-16', '2026-03-29', 'upcoming'),
(5, '2026-03-30', '2026-04-12', 'upcoming');

-- Auto-update cohort statuses based on current date
UPDATE niche_cohorts SET status = 
  CASE 
    WHEN end_date < CURRENT_DATE THEN 'completed'
    WHEN start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE THEN 'active'
    ELSE 'upcoming'
  END;

-- Auto-assign trainees to cohorts based on their date_started
UPDATE niche_training 
SET cohort_id = (
  SELECT c.id 
  FROM niche_cohorts c 
  WHERE niche_training.date_started >= c.start_date 
    AND niche_training.date_started <= c.end_date
  LIMIT 1
)
WHERE date_started IS NOT NULL;