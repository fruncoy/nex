-- Update activity_logs entity_type constraint to include niche types
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_entity_type_check;

ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_entity_type_check 
CHECK (entity_type IN ('candidate', 'client', 'training_lead', 'interview', 'meeting_note', 'niche_training', 'niche_fees'));