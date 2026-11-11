-- Fix the blacklist trigger - remove updated_by column that doesn't exist

CREATE OR REPLACE FUNCTION sync_blacklist_to_candidates()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- If employment_status changed to 'Blacklisted'
  IF NEW.employment_status = 'Blacklisted' AND OLD.employment_status != 'Blacklisted' THEN
    -- Update niche_candidates to BLACKLISTED
    UPDATE niche_candidates
    SET status = 'BLACKLISTED'
    WHERE normalize_phone_niche(phone) = normalize_phone_niche(NEW.phone);
    
    -- Also update niche_training to Expelled if they exist there
    UPDATE niche_training
    SET 
      status = 'Expelled',
      updated_by = 'STAFF_SYNC',
      updated_at = NOW()
    WHERE normalize_phone_niche(phone) = normalize_phone_niche(NEW.phone)
      AND status != 'Expelled';
  END IF;
  
  -- If employment_status changed FROM 'Blacklisted' to something else
  IF OLD.employment_status = 'Blacklisted' AND NEW.employment_status != 'Blacklisted' THEN
    -- Update niche_candidates back to qualified or other status
    UPDATE niche_candidates
    SET status = 'Qualified'
    WHERE normalize_phone_niche(phone) = normalize_phone_niche(NEW.phone)
      AND status = 'BLACKLISTED';
    
    -- Update niche_training status if they exist
    UPDATE niche_training
    SET 
      status = 'Active',
      updated_by = 'STAFF_SYNC',
      updated_at = NOW()
    WHERE normalize_phone_niche(phone) = normalize_phone_niche(NEW.phone)
      AND status = 'Expelled';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS sync_blacklist_to_candidates_trigger ON newstaff_members;
CREATE TRIGGER sync_blacklist_to_candidates_trigger
AFTER UPDATE OF employment_status ON newstaff_members
FOR EACH ROW
EXECUTE FUNCTION sync_blacklist_to_candidates();

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
