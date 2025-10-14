-- Create status_history table to track all status changes
CREATE TABLE status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('candidate', 'client')),
  entity_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by_user_id UUID REFERENCES auth.users(id),
  changed_by_name TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  days_in_previous_status INTEGER,
  notes TEXT
);

-- Create indexes for better performance
CREATE INDEX status_history_entity_idx ON status_history(entity_type, entity_id);
CREATE INDEX status_history_changed_at_idx ON status_history(changed_at);
CREATE INDEX status_history_new_status_idx ON status_history(new_status);

-- Enable RLS
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Allow authenticated users to read status history" ON status_history
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert status history" ON status_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Function to calculate days between status changes
CREATE OR REPLACE FUNCTION calculate_days_in_status(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_new_change_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS INTEGER AS $$
DECLARE
  last_change_time TIMESTAMPTZ;
  days_diff INTEGER;
BEGIN
  -- Get the most recent status change time for this entity
  SELECT changed_at INTO last_change_time
  FROM status_history 
  WHERE entity_type = p_entity_type 
    AND entity_id = p_entity_id
  ORDER BY changed_at DESC 
  LIMIT 1;
  
  -- If no previous change, calculate from entity creation date
  IF last_change_time IS NULL THEN
    IF p_entity_type = 'candidate' THEN
      SELECT created_at INTO last_change_time FROM candidates WHERE id = p_entity_id;
    ELSIF p_entity_type = 'client' THEN
      SELECT created_at INTO last_change_time FROM clients WHERE id = p_entity_id;
    END IF;
  END IF;
  
  -- Calculate days difference
  IF last_change_time IS NOT NULL THEN
    days_diff := EXTRACT(DAY FROM (p_new_change_time - last_change_time));
    RETURN COALESCE(days_diff, 0);
  END IF;
  
  RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_status_change(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_name TEXT,
  p_old_status TEXT,
  p_new_status TEXT,
  p_changed_by_user_id UUID,
  p_changed_by_name TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  days_in_previous INTEGER;
  history_id UUID;
BEGIN
  -- Calculate days in previous status
  days_in_previous := calculate_days_in_status(p_entity_type, p_entity_id);
  
  -- Insert status history record
  INSERT INTO status_history (
    entity_type,
    entity_id,
    entity_name,
    old_status,
    new_status,
    changed_by_user_id,
    changed_by_name,
    days_in_previous_status,
    notes
  ) VALUES (
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_old_status,
    p_new_status,
    p_changed_by_user_id,
    p_changed_by_name,
    days_in_previous,
    p_notes
  ) RETURNING id INTO history_id;
  
  RETURN history_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get status history for an entity
CREATE OR REPLACE FUNCTION get_status_history(
  p_entity_type TEXT,
  p_entity_id UUID
) RETURNS TABLE (
  id UUID,
  old_status TEXT,
  new_status TEXT,
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ,
  days_in_previous_status INTEGER,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sh.id,
    sh.old_status,
    sh.new_status,
    sh.changed_by_name,
    sh.changed_at,
    sh.days_in_previous_status,
    sh.notes
  FROM status_history sh
  WHERE sh.entity_type = p_entity_type 
    AND sh.entity_id = p_entity_id
  ORDER BY sh.changed_at DESC;
END;
$$ LANGUAGE plpgsql;