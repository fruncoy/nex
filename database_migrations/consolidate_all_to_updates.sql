-- Drop all the complex tables that cause constraint issues
DROP TABLE IF EXISTS placement_activity_log CASCADE;
DROP TABLE IF EXISTS placement_followups CASCADE;
DROP TABLE IF EXISTS client_placements CASCADE;
DROP TABLE IF EXISTS candidate_status_history CASCADE;
DROP TABLE IF EXISTS client_status_history CASCADE;
DROP TABLE IF EXISTS status_history CASCADE;
DROP TABLE IF EXISTS updates CASCADE;

-- Drop any views that depend on these tables
DROP VIEW IF EXISTS placement_followup_dashboard CASCADE;

-- Drop all related functions and triggers
DROP FUNCTION IF EXISTS log_placement_activity() CASCADE;
DROP FUNCTION IF EXISTS force_delete_placement(UUID) CASCADE;
DROP FUNCTION IF EXISTS delete_placement_safe(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_unread_notes_count(TEXT, UUID, TEXT) CASCADE;

-- Enhance the existing 'activity_logs' table to handle everything
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS reminder_date DATE;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS activity_type TEXT;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;  -- 'candidate', 'client', 'placement'
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS entity_id UUID;    -- ID of the candidate/client/placement
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS performed_by TEXT; -- Who did the action
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS action_description TEXT; -- 'changed status from X to Y', 'added meeting notes', etc.

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_reminder_date ON activity_logs(reminder_date) WHERE reminder_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_logs_completed ON activity_logs(completed);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_performed_by ON activity_logs(performed_by);