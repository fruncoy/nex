-- Remove course_type column from niche_timetable table
ALTER TABLE niche_timetable DROP COLUMN IF EXISTS course_type;

-- Drop the index on course_type
DROP INDEX IF EXISTS idx_niche_timetable_course_type;