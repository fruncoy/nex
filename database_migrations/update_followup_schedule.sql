-- Update existing follow-up types to new 2-week intervals
-- Old: 1_week, 2_week, 3_week, 1_month
-- New: 2_week, 4_week, 6_week, 8_week, 10_week, 12_week

UPDATE placement_followups 
SET followup_type = '2_week' 
WHERE followup_type = '1_week';

UPDATE placement_followups 
SET followup_type = '4_week' 
WHERE followup_type = '2_week';

UPDATE placement_followups 
SET followup_type = '6_week' 
WHERE followup_type = '3_week';

UPDATE placement_followups 
SET followup_type = '8_week' 
WHERE followup_type = '1_month';

-- Delete all existing follow-ups (they will be recreated with correct format)
DELETE FROM placement_followups;

-- Add new check constraint with updated values
ALTER TABLE placement_followups ADD CONSTRAINT placement_followups_followup_type_check 
CHECK (followup_type IN ('2_week', '4_week', '6_week', '8_week', '10_week', '12_week'));



-- Note: New follow-ups will be automatically created with the correct 
-- 2-week intervals when new placements are added or when existing 
-- placements are managed through the application.