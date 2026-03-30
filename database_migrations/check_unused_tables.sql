-- Check for potentially unused tables that might need cleanup

-- Check if deliverables table exists and has data
SELECT 'deliverables' as table_name, COUNT(*) as record_count 
FROM deliverables;

-- Check if task_assignments table exists and has data
SELECT 'task_assignments' as table_name, COUNT(*) as record_count 
FROM task_assignments;

-- Check meeting_note_tasks table
SELECT 'meeting_note_tasks' as table_name, COUNT(*) as record_count 
FROM meeting_note_tasks;

-- List all tables in the database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;