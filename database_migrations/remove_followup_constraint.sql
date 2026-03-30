-- Remove the constraint entirely to allow flexible followup types
-- This allows the application to use the new 2-week interval format

-- Drop the existing check constraint
ALTER TABLE placement_followups DROP CONSTRAINT IF EXISTS placement_followups_followup_type_check;

-- Delete all existing follow-ups (they will be recreated with correct format)
DELETE FROM placement_followups;

-- Note: No constraint will be added back, allowing the application 
-- to use the new format (2_week, 4_week, 6_week, 8_week, 10_week, 12_week)
-- New follow-ups will be automatically created with the correct 
-- 2-week intervals when placements are managed.