-- Update existing candidates with false values to null for has_kids and has_siblings
-- This will make them show "Not specified" instead of "No"

UPDATE candidates 
SET has_kids = NULL 
WHERE has_kids = false;

UPDATE candidates 
SET has_siblings = NULL 
WHERE has_siblings = false;