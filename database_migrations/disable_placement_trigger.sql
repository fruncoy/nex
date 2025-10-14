-- Find and disable the trigger that's causing the issue
-- First, let's see what triggers exist
SELECT trigger_name, event_manipulation, action_timing 
FROM information_schema.triggers 
WHERE event_object_table = 'client_placements';

-- Disable the trigger (replace 'trigger_name' with actual name from above query)
-- ALTER TABLE client_placements DISABLE TRIGGER trigger_name_here;

-- Or disable all triggers temporarily
ALTER TABLE client_placements DISABLE TRIGGER ALL;

-- Now you can delete the placement record manually
-- DELETE FROM client_placements WHERE id = 'e4b8a2e4-f2b3-4fc7-b666-551caf2fb82a';

-- Re-enable triggers after deletion
-- ALTER TABLE client_placements ENABLE TRIGGER ALL;