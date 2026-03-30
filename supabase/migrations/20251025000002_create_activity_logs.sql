/*
  # Activity Logging System

  1. New Table
    - `activity_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references staff)
      - `action_type` (text) - 'status_change', 'login', 'logout', 'edit', 'create', 'delete'
      - `entity_type` (text) - 'candidate', 'client', 'training_lead', 'interview'
      - `entity_id` (uuid, nullable)
      - `entity_name` (text) - name of the entity for display
      - `old_value` (text, nullable) - for status changes
      - `new_value` (text, nullable) - for status changes
      - `description` (text) - formatted description for display
      - `created_at` (timestamptz)

  2. Indexes
    - Index on created_at for date-based queries
    - Index on user_id for user-specific queries
    - Index on action_type for filtering

  3. Security
    - Enable RLS
    - Allow all authenticated users to view and insert
*/

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES staff(id) NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('status_change', 'login', 'logout', 'edit', 'create', 'delete', 'reschedule', 'bulk_upload')),
  entity_type text CHECK (entity_type IN ('candidate', 'client', 'training_lead', 'interview', 'meeting_note')),
  entity_id uuid,
  entity_name text,
  old_value text,
  new_value text,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for activity_logs (with IF NOT EXISTS equivalent)
DO $$
BEGIN
  -- Create view policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activity_logs' 
    AND policyname = 'Staff can view all activity logs'
  ) THEN
    CREATE POLICY "Staff can view all activity logs"
      ON activity_logs FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  -- Create insert policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activity_logs' 
    AND policyname = 'Staff can insert activity logs'
  ) THEN
    CREATE POLICY "Staff can insert activity logs"
      ON activity_logs FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_action_type_idx ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS activity_logs_entity_type_idx ON activity_logs(entity_type);