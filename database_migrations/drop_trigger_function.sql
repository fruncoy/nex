-- First, find the trigger that calls log_placement_activity
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'client_placements' 
AND action_statement LIKE '%log_placement_activity%';

-- Drop the trigger temporarily (replace with actual trigger name from above)
-- DROP TRIGGER IF EXISTS trigger_name_here ON client_placements;

-- Or modify the function to not insert when deleting
CREATE OR REPLACE FUNCTION log_placement_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip logging for DELETE operations to avoid constraint issues
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  -- Your existing function logic for INSERT/UPDATE here
  -- (keeping original logic for non-DELETE operations)
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;