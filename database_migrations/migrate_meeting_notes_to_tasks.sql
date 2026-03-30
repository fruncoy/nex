-- Migrate existing meeting notes to new task structure
-- PRESERVE existing data - do not delete anything
-- Migrate to meeting_note_tasks table for better task assignment tracking

-- First, migrate existing meeting notes to meeting_note_tasks
-- For now, assign all tasks to the person who created the meeting note
-- Later, frontend can be updated to allow specific user assignments

INSERT INTO meeting_note_tasks (meeting_note_id, task_description, assigned_to, assigned_by, status, created_at)
SELECT 
  id as meeting_note_id,
  trim(both '"' from jsonb_array_elements_text(notes::jsonb)) as task_description,
  created_by as assigned_to,
  created_by as assigned_by,
  CASE WHEN status = 'completed' THEN 'completed' ELSE 'pending' END as status,
  created_at
FROM meeting_notes 
WHERE notes IS NOT NULL 
AND created_by IS NOT NULL
AND jsonb_typeof(notes::jsonb) = 'array'
ON CONFLICT DO NOTHING;

-- Handle notes stored as text arrays (fallback)
INSERT INTO meeting_note_tasks (meeting_note_id, task_description, assigned_to, assigned_by, status, created_at)
SELECT 
  id as meeting_note_id,
  trim(unnest(string_to_array(trim(both '[]' from replace(notes::text, '"', '')), ','))) as task_description,
  created_by as assigned_to,
  created_by as assigned_by,
  CASE WHEN status = 'completed' THEN 'completed' ELSE 'pending' END as status,
  created_at
FROM meeting_notes 
WHERE notes IS NOT NULL 
AND created_by IS NOT NULL
AND notes::text LIKE '[%]'
AND NOT EXISTS (
  SELECT 1 FROM meeting_note_tasks WHERE meeting_note_id = meeting_notes.id
)
ON CONFLICT DO NOTHING;

-- Keep original meeting_notes table intact for now
-- Frontend can gradually transition to using meeting_note_tasks