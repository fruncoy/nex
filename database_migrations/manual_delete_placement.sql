-- Delete the placement manually in the correct order
-- Replace the UUID with your actual placement ID

-- Step 1: Delete from placement_activity_log first
DELETE FROM placement_activity_log 
WHERE placement_id = 'e4b8a2e4-f2b3-4fc7-b666-551caf2fb82a';

-- Step 2: Delete from placement_followups
DELETE FROM placement_followups 
WHERE placement_id = 'e4b8a2e4-f2b3-4fc7-b666-551caf2fb82a';

-- Step 3: Now delete the placement (this should work without constraint errors)
DELETE FROM client_placements 
WHERE id = 'e4b8a2e4-f2b3-4fc7-b666-551caf2fb82a';