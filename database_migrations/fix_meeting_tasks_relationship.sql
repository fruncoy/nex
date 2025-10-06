-- Fix column types and add foreign key relationships
ALTER TABLE meeting_note_tasks 
DROP CONSTRAINT IF EXISTS meeting_note_tasks_meeting_note_id_fkey;

ALTER TABLE meeting_note_tasks 
DROP CONSTRAINT IF EXISTS meeting_note_tasks_assigned_to_fkey;

-- Fix assigned_to column type to match staff.id (uuid)
ALTER TABLE meeting_note_tasks 
ALTER COLUMN assigned_to TYPE uuid USING assigned_to::uuid;

ALTER TABLE meeting_note_tasks 
ALTER COLUMN assigned_by TYPE uuid USING assigned_by::uuid;

ALTER TABLE meeting_note_tasks 
ADD CONSTRAINT meeting_note_tasks_meeting_note_id_fkey 
FOREIGN KEY (meeting_note_id) REFERENCES meeting_notes(id) ON DELETE CASCADE;

ALTER TABLE meeting_note_tasks 
ADD CONSTRAINT meeting_note_tasks_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES staff(id) ON DELETE CASCADE;