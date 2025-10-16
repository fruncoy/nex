-- Create missing database functions for activity logging

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
  log_id UUID;
BEGIN
  INSERT INTO activity_logs (
    user_id,
    action_type,
    entity_type,
    entity_id,
    entity_name,
    old_value,
    new_value,
    description
  ) VALUES (
    p_changed_by_user_id,
    'status_change',
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_old_status,
    p_new_status,
    p_changed_by_name || ' changed ' || p_entity_name || ' status from ' || p_old_status || ' to ' || p_new_status
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;