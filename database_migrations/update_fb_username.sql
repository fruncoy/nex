-- Update placement_followups to use actual staff username from database

-- Update all existing records to use FB username where completed_by_username is null
UPDATE placement_followups 
SET completed_by_username = (
  SELECT username FROM staff WHERE id = placement_followups.updated_by LIMIT 1
)
WHERE completed_date IS NOT NULL 
AND completed_by_username IS NULL;

-- Set default FB username for records where staff lookup fails
UPDATE placement_followups 
SET completed_by_username = 'FB'
WHERE completed_date IS NOT NULL 
AND completed_by_username IS NULL;