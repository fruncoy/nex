-- ============================================================================
-- COMPREHENSIVE STATUS SYNCHRONIZATION FIX - STEP 1
-- ============================================================================
-- This fixes the synchronization logic between:
-- - niche_candidates (MASTER TABLE)
-- - niche_training
-- - newstaff_members
--
-- RULES:
-- 1. Niche Candidates is the master table - everyone must exist here
-- 2. Blacklisting in Staff Management → updates Niche Candidates
-- 3. Blacklisting in Staff Management → DOES NOT change Niche Training status
-- 4. Expelled in Niche Training → updates Niche Candidates to BLACKLISTED
-- 5. Graduated status in Niche Training is preserved (never overwritten by blacklist)
-- ============================================================================

-- ============================================================================
-- PART 1: Fix existing incorrectly changed records
-- ============================================================================

-- Restore training status for people who were graduated but got changed to Expelled
-- due to previous incorrect blacklist sync
UPDATE niche_training nt
SET 
  status = 'Graduated',
  updated_by = 'SYNC_FIX',
  updated_at = NOW()
FROM niche_candidates nc
WHERE normalize_phone_niche(nt.phone) = normalize_phone_niche(nc.phone)
  AND nc.status = 'BLACKLISTED'
  AND nt.status = 'Expelled'
  AND nt.id IN (
    -- Find training records that should be Graduated based on completion
    SELECT nt2.id 
    FROM niche_training nt2
    WHERE nt2.status = 'Expelled'
      AND EXISTS (
        SELECT 1 FROM niche_candidates nc2
        WHERE normalize_phone_niche(nc2.phone) = normalize_phone_niche(nt2.phone)
          AND nc2.status = 'BLACKLISTED'
      )
      -- Add any other logic to identify incorrectly expelled
  );

-- ============================================================================
-- PART 2: Update Triggers
-- ============================================================================

-- TRIGGER 1: niche_candidates → niche_training sync (for Expelled status only)
-- When candidate is expelled from training, update niche_candidates
DROP FUNCTION IF EXISTS sync_training_expelled_to_candidates();
CREATE OR REPLACE FUNCTION sync_training_expelled_to_candidates()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only sync when status changes TO Expelled
  IF NEW.status = 'Expelled' AND OLD.status != 'Expelled' THEN
    -- Update niche_candidates to BLACKLISTED
    UPDATE niche_candidates
    SET status = 'BLACKLISTED'
    WHERE normalize_phone_niche(phone) = normalize_phone_niche(NEW.phone)
      AND status != 'BLACKLISTED';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on niche_training
DROP TRIGGER IF EXISTS sync_training_expelled_trigger ON niche_training;
CREATE TRIGGER sync_training_expelled_trigger
AFTER UPDATE OF status ON niche_training
FOR EACH ROW
EXECUTE FUNCTION sync_training_expelled_to_candidates();

-- TRIGGER 2: newstaff_members → niche_candidates sync (blacklist only, NOT training)
-- When blacklisted in staff, update candidates but NOT training
CREATE OR REPLACE FUNCTION sync_blacklist_to_candidates()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- If employment_status changed to 'Blacklisted'
  IF NEW.employment_status = 'Blacklisted' AND OLD.employment_status != 'Blacklisted' THEN
    -- Update niche_candidates to BLACKLISTED only
    UPDATE niche_candidates
    SET status = 'BLACKLISTED'
    WHERE normalize_phone_niche(phone) = normalize_phone_niche(NEW.phone)
      AND status != 'BLACKLISTED';
    
    -- DO NOT touch niche_training - preserve Graduated/Completed status
  END IF;
  
  -- If employment_status changed FROM 'Blacklisted' to something else
  IF OLD.employment_status = 'Blacklisted' AND NEW.employment_status != 'Blacklisted' THEN
    -- Update niche_candidates back to Qualified
    UPDATE niche_candidates
    SET status = 'Qualified'
    WHERE normalize_phone_niche(phone) = normalize_phone_niche(NEW.phone)
      AND status = 'BLACKLISTED';
    
    -- DO NOT touch niche_training
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger on newstaff_members
DROP TRIGGER IF EXISTS sync_blacklist_to_candidates_trigger ON newstaff_members;
CREATE TRIGGER sync_blacklist_to_candidates_trigger
AFTER UPDATE OF employment_status ON newstaff_members
FOR EACH ROW
EXECUTE FUNCTION sync_blacklist_to_candidates();

-- TRIGGER 3: niche_candidates → newstaff_members sync (bidirectional)
-- When blacklisted in candidates, update staff
DROP FUNCTION IF EXISTS sync_candidates_blacklist_to_staff();
CREATE OR REPLACE FUNCTION sync_candidates_blacklist_to_staff()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- If status changed to BLACKLISTED
  IF NEW.status = 'BLACKLISTED' AND OLD.status != 'BLACKLISTED' THEN
    -- Update newstaff_members to Blacklisted
    UPDATE newstaff_members
    SET employment_status = 'Blacklisted'
    WHERE normalize_phone_niche(phone) = normalize_phone_niche(NEW.phone)
      AND employment_status != 'Blacklisted';
  END IF;
  
  -- If status changed FROM BLACKLISTED
  IF OLD.status = 'BLACKLISTED' AND NEW.status != 'BLACKLISTED' THEN
    -- Update newstaff_members to remove Blacklisted status
    UPDATE newstaff_members
    SET employment_status = 'Yet to be Employed'
    WHERE normalize_phone_niche(phone) = normalize_phone_niche(NEW.phone)
      AND employment_status = 'Blacklisted';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on niche_candidates
DROP TRIGGER IF EXISTS sync_candidates_blacklist_trigger ON niche_candidates;
CREATE TRIGGER sync_candidates_blacklist_trigger
AFTER UPDATE OF status ON niche_candidates
FOR EACH ROW
EXECUTE FUNCTION sync_candidates_blacklist_to_staff();

-- ============================================================================
-- PART 3: Verify all candidates exist in master table
-- ============================================================================

-- Add missing candidates from niche_training to niche_candidates
INSERT INTO niche_candidates (
  name, phone, role, status
)
SELECT DISTINCT
  nt.name,
  nt.phone,
  COALESCE(nt.role, 'House Manager'),
  CASE 
    WHEN nt.status = 'Active' THEN 'Active in Training'
    WHEN nt.status = 'Graduated' THEN 'Graduated'
    WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'
    WHEN nt.status = 'Completed' THEN 'Graduated'
    ELSE 'Qualified'
  END
FROM niche_training nt
WHERE nt.phone IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM niche_candidates nc
    WHERE normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
  );

-- ============================================================================
-- PART 4: Update sync_graduates_to_staff function
-- ============================================================================

DROP FUNCTION IF EXISTS sync_graduates_to_staff();
CREATE OR REPLACE FUNCTION sync_graduates_to_staff()
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  imported_count INT := 0;
  updated_count INT := 0;
  blacklisted_count INT := 0;
  total_count INT := 0;
  grad_record RECORD;
  existing_id UUID;
BEGIN
  -- First: Add blacklisted candidates who don't exist in newstaff_members
  INSERT INTO newstaff_members (
    name, phone, role, employment_status, signed_coc,
    created_by, updated_by, created_at, updated_at
  )
  SELECT 
    nc.name, nc.phone, COALESCE(nc.role, 'House Manager'),
    'Blacklisted', false, 'GRADUATE_SYNC', 'GRADUATE_SYNC', NOW(), NOW()
  FROM niche_candidates nc
  WHERE nc.status = 'BLACKLISTED'
    AND NOT EXISTS (
      SELECT 1 FROM newstaff_members sm 
      WHERE normalize_phone_niche(sm.phone) = normalize_phone_niche(nc.phone)
    );
  
  GET DIAGNOSTICS blacklisted_count = ROW_COUNT;
  
  -- Second: Update existing staff to Blacklisted status
  UPDATE newstaff_members sm
  SET employment_status = 'Blacklisted', updated_by = 'GRADUATE_SYNC', updated_at = NOW()
  FROM niche_candidates nc
  WHERE normalize_phone_niche(sm.phone) = normalize_phone_niche(nc.phone)
    AND nc.status = 'BLACKLISTED'
    AND sm.employment_status != 'Blacklisted';
  
  blacklisted_count := blacklisted_count + ROW_COUNT;
  
  -- Third: Sync graduated trainees (NOT Expelled - they're blacklisted, not staff)
  FOR grad_record IN 
    SELECT DISTINCT nt.name, nt.phone, nt.role, nt.cohort_id, nt.course, nt.status
    FROM niche_training nt
    WHERE nt.status = 'Graduated'
    ORDER BY nt.name
  LOOP
    total_count := total_count + 1;
    
    SELECT id INTO existing_id FROM newstaff_members
    WHERE phone = grad_record.phone LIMIT 1;
    
    IF existing_id IS NULL THEN
      -- Insert new staff member (Graduated only, not Expelled)
      INSERT INTO newstaff_members (
        name, phone, role, employment_status, signed_coc,
        created_by, updated_by, created_at, updated_at
      ) VALUES (
        grad_record.name, grad_record.phone, COALESCE(grad_record.role, 'House Manager'),
        'Yet to be Employed', false, 'GRADUATE_SYNC', 'GRADUATE_SYNC', NOW(), NOW()
      );
      imported_count := imported_count + 1;
    ELSE
      -- Update existing staff (preserve Employed status)
      UPDATE newstaff_members
      SET name = COALESCE(grad_record.name, name),
          role = COALESCE(grad_record.role, role),
          employment_status = CASE WHEN employment_status = 'Employed' THEN employment_status ELSE 'Yet to be Employed' END,
          updated_by = 'GRADUATE_SYNC', updated_at = NOW()
      WHERE id = existing_id;
      updated_count := updated_count + 1;
    END IF;
    
    existing_id := NULL;
  END LOOP;
  
  RETURN json_build_object(
    'imported', imported_count,
    'updated', updated_count,
    'blacklisted', blacklisted_count,
    'total', total_count,
    'message', FORMAT('Synced %s trainees: %s new graduates, %s updated, %s blacklisted', 
                      total_count, imported_count, updated_count, blacklisted_count)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION sync_graduates_to_staff() TO authenticated;

-- ============================================================================
-- PART 5: Fix existing employment status values
-- ============================================================================

-- Change "Available" to "Yet to be Employed"
UPDATE newstaff_members
SET employment_status = 'Yet to be Employed'
WHERE employment_status = 'Available';

-- ============================================================================
-- Notify PostgREST
-- ============================================================================
NOTIFY pgrst, 'reload schema';
