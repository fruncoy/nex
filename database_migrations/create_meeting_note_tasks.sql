-- Create a separate table for individual meeting note tasks with assignments
CREATE TABLE IF NOT EXISTS meeting_note_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_note_id UUID REFERENCES meeting_notes(id) ON DELETE CASCADE,
  task_description TEXT NOT NULL,
  assigned_to VARCHAR(255) NOT NULL,
  assigned_by VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  completed_by VARCHAR(255)
);

-- Add RLS policy
ALTER TABLE meeting_note_tasks ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Users can view and manage meeting note tasks" ON meeting_note_tasks
  FOR ALL USING (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_meeting_note_tasks_meeting_id ON meeting_note_tasks(meeting_note_id);
CREATE INDEX IF NOT EXISTS idx_meeting_note_tasks_assigned_to ON meeting_note_tasks(assigned_to);