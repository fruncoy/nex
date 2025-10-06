-- Add linked_to_id field to meeting_notes table to track who tasks are assigned to
ALTER TABLE meeting_notes ADD COLUMN IF NOT EXISTS linked_to_id VARCHAR(255);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_meeting_notes_linked_to ON meeting_notes(linked_to_id);