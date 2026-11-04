-- Create ALL missing RPC functions
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. update_cohort_statuses (already created, but included here for reference)
-- ============================================
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
  END;
END;
$$;

-- ============================================
-- 2. create_next_cohorts
-- ============================================
CREATE OR REPLACE FUNCTION create_next_cohorts(num_cohorts INT DEFAULT 5)
RETURNS TABLE(id UUID, cohort_number INT, start_date DATE, end_date DATE, status TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  last_cohort_num INT;
  new_cohort_num INT;
  new_start_date DATE;
  new_end_date DATE;
  counter INT := 1;
BEGIN
  -- Get the highest cohort number
  SELECT COALESCE(MAX(cohort_number), 0) INTO last_cohort_num
  FROM niche_cohorts;
  
  WHILE counter <= num_cohorts LOOP
    new_cohort_num := last_cohort_num + counter;
    
    -- Calculate start date: 2 days after the last end date
    IF counter = 1 THEN
      SELECT COALESCE(MAX(end_date) + INTERVAL '2 days', CURRENT_DATE) INTO new_start_date
      FROM niche_cohorts;
    ELSE
      new_start_date := new_end_date + INTERVAL '2 days';
    END IF;
    
    -- End date is 13 days after start (14-day cohort)
    new_end_date := new_start_date + INTERVAL '13 days';
    
    -- Insert the cohort
    INSERT INTO niche_cohorts (cohort_number, start_date, end_date, status, training_type)
    VALUES (
      new_cohort_num,
      new_start_date,
      new_end_date,
      CASE 
        WHEN new_start_date <= CURRENT_DATE AND new_end_date >= CURRENT_DATE THEN 'active'
        WHEN new_end_date < CURRENT_DATE THEN 'completed'
        ELSE 'upcoming'
      END,
      '2week'
    )
    RETURNING niche_cohorts.id, niche_cohorts.cohort_number, niche_cohorts.start_date, 
              niche_cohorts.end_date, niche_cohorts.status INTO id, cohort_number, start_date, end_date, status;
    
    counter := counter + 1;
  END LOOP;
  
  RETURN NEXT;
END;
$$;

-- ============================================
-- 3. force_sync_all_niche_data
-- ============================================
CREATE OR REPLACE FUNCTION force_sync_all_niche_data()
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  candidates_synced INT := 0;
  training_synced INT := 0;
  errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Sync candidates to training
  INSERT INTO niche_training (name, phone, role, status, cohort_id, created_by, updated_by)
  SELECT 
    nc.name,
    nc.phone,
    nc.role,
    'Active',
    nc.cohort_id,
    'SYNC_FUNCTION',
    'SYNC_FUNCTION'
  FROM niche_candidates nc
  WHERE nc.status = 'Active in Training'
    AND NOT EXISTS (
      SELECT 1 FROM niche_training nt 
      WHERE normalize_phone_niche(nt.phone) = normalize_phone_niche(nc.phone)
    )
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS candidates_synced = ROW_COUNT;
  
  -- Sync graduated candidates
  UPDATE niche_training nt
  SET status = 'Graduated', updated_by = 'SYNC_FUNCTION', updated_at = NOW()
  FROM niche_candidates nc
  WHERE normalize_phone_niche(nt.phone) = normalize_phone_niche(nc.phone)
    AND nc.status = 'Graduated'
    AND nt.status != 'Graduated';
  
  GET DIAGNOSTICS training_synced = ROW_COUNT;
  
  RETURN json_build_object(
    'candidates_synced', candidates_synced,
    'training_synced', training_synced,
    'message', FORMAT('Synced %s candidates to training, updated %s training records', 
                      candidates_synced, training_synced)
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_cohort_statuses() TO authenticated;
GRANT EXECUTE ON FUNCTION create_next_cohorts(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION force_sync_all_niche_data() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_graduates_to_staff() TO authenticated;

-- Reload schema
NOTIFY pgrst, 'reload schema';
