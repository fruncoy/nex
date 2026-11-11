-- Check if the blacklist trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'newstaff_members';

-- Test: Try updating a staff member status
-- First check current status
SELECT id, name, phone, employment_status
FROM newstaff_members
WHERE employment_status = 'Yet to be Employed'
LIMIT 1;
