-- Update all existing candidates to show 'System' instead of staff names
UPDATE candidates 
SET added_by = 'System' 
WHERE added_by IS NOT NULL 
AND added_by != 'self';