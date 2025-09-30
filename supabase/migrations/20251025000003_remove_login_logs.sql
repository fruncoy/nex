/*
  # Remove Login/Logout Activity Logs

  1. Clean Up Data
    - Remove all existing login/logout activity logs
    
  2. Update Schema
    - Update action_type constraint to remove 'login' and 'logout'
    - Keep only 'status_change', 'edit', 'create', 'delete'
*/

-- Delete all login and logout activity logs
DELETE FROM activity_logs WHERE action_type IN ('login', 'logout');

-- Drop the existing constraint
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_action_type_check;

-- Add new constraint without login/logout but with reschedule and bulk_upload
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_action_type_check 
  CHECK (action_type IN ('status_change', 'edit', 'create', 'delete', 'reschedule', 'bulk_upload'));