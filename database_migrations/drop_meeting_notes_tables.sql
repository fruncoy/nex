-- Drop meeting notes related tables
-- Drop meeting_note_tasks first because it has a foreign key to meeting_notes
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meeting_note_tasks') THEN
    DROP TABLE IF EXISTS meeting_note_tasks;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meeting_notes') THEN
    DROP TABLE IF EXISTS meeting_notes;
  END IF;
END $$;
