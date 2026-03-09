-- Just update cohort statuses based on current date
UPDATE niche_cohorts SET status = 
    CASE 
        WHEN end_date < CURRENT_DATE THEN 'completed'
        WHEN start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE THEN 'active'
        ELSE 'upcoming'
    END;