-- Create or replace the update_cohort_statuses function
-- This function automatically updates cohort statuses based on current date

CREATE OR REPLACE FUNCTION update_cohort_statuses()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE niche_cohorts
  SET status = CASE
    WHEN end_date < CURRENT_DATE THEN 'completed'::text
    WHEN start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE THEN 'active'::text
    ELSE 'upcoming'::text
  END
  WHERE status != CASE
    WHEN end_date < CURRENT_DATE THEN 'completed'::text
    WHEN start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE THEN 'active'::text
    ELSE 'upcoming'::text
  END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_cohort_statuses() TO authenticated;

-- Run it once to fix current statuses
SELECT update_cohort_statuses();

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
