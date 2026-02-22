-- Function to automatically create next cohorts
CREATE OR REPLACE FUNCTION create_next_cohorts(num_cohorts INTEGER DEFAULT 5)
RETURNS TABLE(cohort_number INTEGER, start_date DATE, end_date DATE) AS $$
DECLARE
    last_cohort_num INTEGER;
    last_end_date DATE;
    next_start_date DATE;
    next_end_date DATE;
    i INTEGER;
BEGIN
    -- Get the last cohort number and end date
    SELECT MAX(c.cohort_number), MAX(c.end_date) 
    INTO last_cohort_num, last_end_date
    FROM niche_cohorts c;
    
    -- If no cohorts exist, start from cohort 1 on next Monday
    IF last_cohort_num IS NULL THEN
        last_cohort_num := 0;
        next_start_date := date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'; -- Next Monday
    ELSE
        -- Calculate next Monday after last cohort ends
        next_start_date := last_end_date + INTERVAL '3 days'; -- Assuming Friday end, Monday start
        -- Ensure it's a Monday
        next_start_date := date_trunc('week', next_start_date) + INTERVAL '7 days';
    END IF;
    
    -- Create the specified number of cohorts
    FOR i IN 1..num_cohorts LOOP
        next_end_date := next_start_date + INTERVAL '11 days'; -- 2 weeks (12 days) - 1
        
        INSERT INTO niche_cohorts (cohort_number, start_date, end_date, status)
        VALUES (last_cohort_num + i, next_start_date, next_end_date, 'upcoming');
        
        -- Return the created cohort info
        cohort_number := last_cohort_num + i;
        start_date := next_start_date;
        end_date := next_end_date;
        RETURN NEXT;
        
        -- Move to next cohort start date (Monday after 2-week gap)
        next_start_date := next_end_date + INTERVAL '3 days';
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to update cohort statuses based on current date
CREATE OR REPLACE FUNCTION update_cohort_statuses()
RETURNS VOID AS $$
BEGIN
    -- Mark past cohorts as completed
    UPDATE niche_cohorts 
    SET status = 'completed' 
    WHERE end_date < CURRENT_DATE AND status != 'completed';
    
    -- Mark current cohorts as active
    UPDATE niche_cohorts 
    SET status = 'active' 
    WHERE start_date <= CURRENT_DATE 
    AND end_date >= CURRENT_DATE 
    AND status != 'active';
    
    -- Mark future cohorts as upcoming
    UPDATE niche_cohorts 
    SET status = 'upcoming' 
    WHERE start_date > CURRENT_DATE 
    AND status != 'upcoming';
END;
$$ LANGUAGE plpgsql;