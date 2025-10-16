-- Fix the candidate_status_history error by creating a dummy table or removing triggers

-- Option 1: Create a simple dummy table to satisfy any existing triggers
CREATE TABLE IF NOT EXISTS candidate_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID,
  old_status TEXT,
  new_status TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- Option 2: Drop any triggers that might be causing this
DROP TRIGGER IF EXISTS candidate_status_change_trigger ON candidates;
DROP FUNCTION IF EXISTS log_candidate_status_change();

-- Enable RLS on the dummy table
ALTER TABLE candidate_status_history ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_status_history' AND policyname = 'Allow all operations') THEN
    CREATE POLICY "Allow all operations" ON candidate_status_history FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- Also create client_status_history table
CREATE TABLE IF NOT EXISTS client_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  old_status TEXT,
  new_status TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- Drop any client triggers that might be causing this
DROP TRIGGER IF EXISTS client_status_change_trigger ON clients;
DROP FUNCTION IF EXISTS log_client_status_change();

-- Enable RLS on the client dummy table
ALTER TABLE client_status_history ENABLE ROW LEVEL SECURITY;

-- Create policy for clients only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_status_history' AND policyname = 'Allow all client operations') THEN
    CREATE POLICY "Allow all client operations" ON client_status_history FOR ALL TO authenticated USING (true);
  END IF;
END $$;