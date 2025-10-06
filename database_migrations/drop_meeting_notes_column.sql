-- Remove the notes column from meeting_notes table since we're using meeting_note_tasks
ALTER TABLE meeting_notes DROP COLUMN IF EXISTS notes;