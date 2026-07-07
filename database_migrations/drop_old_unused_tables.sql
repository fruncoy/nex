-- Drop old unused tables
-- Check if tables exist before dropping to avoid errors

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deliverables') THEN
    DROP TABLE IF EXISTS deliverables;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_assignments') THEN
    DROP TABLE IF EXISTS task_assignments;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meeting_note_tasks') THEN
    DROP TABLE IF EXISTS meeting_note_tasks;
  END IF;
END $$;
