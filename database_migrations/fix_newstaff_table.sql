-- Fix script for existing newstaff_members table
-- Run this if you already created the table before the fix

-- First, drop the old unique constraint on phone if it exists
ALTER TABLE newstaff_members DROP CONSTRAINT IF EXISTS newstaff_members_phone_key;

-- Make phone nullable
ALTER TABLE newstaff_members ALTER COLUMN phone DROP NOT NULL;

-- Add unique constraint on niche_training_id instead
ALTER TABLE newstaff_members ADD CONSTRAINT newstaff_members_niche_training_id_key UNIQUE (niche_training_id);

-- Create or replace the sync function
CREATE OR REPLACE FUNCTION sync_graduates_to_staff()
RETURNS json AS $$
DECLARE
  v_imported integer := 0;
  v_skipped integer := 0;
  v_updated integer := 0;
BEGIN
  -- Insert new graduates not already in staff
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
  WHERE nt.status IN ('Graduated', 'Completed')
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
  
  -- Count how many were already there
  SELECT COUNT(*) INTO v_skipped
  FROM newstaff_members sm
  JOIN niche_training nt ON sm.niche_training_id = nt.id
  WHERE nt.status IN ('Graduated', 'Completed');
  
  RETURN json_build_object(
    'imported', v_imported,
    'updated', v_updated,
    'total', v_imported + v_updated + v_skipped
  );
END;
$$ LANGUAGE plpgsql;
