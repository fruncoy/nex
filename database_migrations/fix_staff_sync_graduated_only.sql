-- STEP 1: Preview who will be deleted (run this first to verify)
SELECT sm.id, sm.name, sm.phone, sm.employment_status, nt.status as training_status
FROM newstaff_members sm
JOIN niche_training nt ON sm.niche_training_id = nt.id
WHERE nt.status = 'Completed'
  AND nt.status != 'Graduated';

-- STEP 2: Delete staff members imported from 'Completed' (short course) training records
-- Only deletes those linked via niche_training_id — manually added staff are safe
DELETE FROM newstaff_members
WHERE niche_training_id IN (
  SELECT id FROM niche_training
  WHERE status = 'Completed'
    AND status != 'Graduated'
);

-- STEP 3: Fix the sync function to only import Graduated (not Completed)
CREATE OR REPLACE FUNCTION sync_graduates_to_staff()
RETURNS json AS $$
DECLARE
  v_imported integer := 0;
  v_skipped integer := 0;
  v_updated integer := 0;
BEGIN
  -- Insert new graduates not already in staff (Graduated only)
  INSERT INTO newstaff_members (
    name,
    phone,
    role,
    niche_training_id,
    signed_coc,
    created_by,
    updated_by
  )
  SELECT 
    nt.name,
    nt.phone,
    nt.role,
    nt.id,
    false,
    'System',
    'System'
  FROM niche_training nt
  WHERE nt.status = 'Graduated'
    AND NOT EXISTS (
      SELECT 1 FROM newstaff_members sm 
      WHERE sm.niche_training_id = nt.id
    );
  
  GET DIAGNOSTICS v_imported = ROW_COUNT;
  
  -- Update existing staff if info changed in niche_training
  UPDATE newstaff_members sm
  SET 
    name = nt.name,
    phone = nt.phone,
    role = nt.role,
    updated_at = now(),
    updated_by = 'System'
  FROM niche_training nt
  WHERE sm.niche_training_id = nt.id
    AND (sm.name != nt.name OR sm.phone != nt.phone OR sm.role != nt.role);
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  SELECT COUNT(*) INTO v_skipped
  FROM newstaff_members sm
  JOIN niche_training nt ON sm.niche_training_id = nt.id
  WHERE nt.status = 'Graduated';
  
  RETURN json_build_object(
    'imported', v_imported,
    'updated', v_updated,
    'total', v_imported + v_updated + v_skipped
  );
END;
$$ LANGUAGE plpgsql;
