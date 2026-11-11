-- Remove Meetings, Referrals, and Sponsorship from database
-- These features are not needed

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS newstaff_meeting_attendance CASCADE;
DROP TABLE IF EXISTS newstaff_meetings CASCADE;
DROP TABLE IF EXISTS newstaff_contributions CASCADE;
DROP TABLE IF EXISTS newstaff_welfare_members CASCADE;

-- Also drop any related policies (automatically dropped with CASCADE)

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
