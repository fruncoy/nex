-- Fix cohort statuses for March 8, 2026
-- Cohort 1 (Feb 2-15) should be completed
-- Cohort 2 (Feb 16 - Mar 1) should be completed  
-- Cohort 3 (Mar 2-15) should be active (we're on Mar 8)
-- Cohort 4+ should be upcoming

UPDATE niche_cohorts SET status = 'completed' WHERE cohort_number = 1;
UPDATE niche_cohorts SET status = 'completed' WHERE cohort_number = 2;  
UPDATE niche_cohorts SET status = 'active' WHERE cohort_number = 3;
UPDATE niche_cohorts SET status = 'upcoming' WHERE cohort_number >= 4;

-- Run the automatic status update function
SELECT update_cohort_statuses();