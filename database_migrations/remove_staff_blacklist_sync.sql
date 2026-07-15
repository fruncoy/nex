-- Remove blacklist sync trigger and function
DROP TRIGGER IF EXISTS sync_staff_blacklist_trigger ON newstaff_members;
DROP FUNCTION IF EXISTS sync_staff_blacklist_to_candidates();
