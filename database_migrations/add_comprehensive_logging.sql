-- Add comprehensive logging for all placement and candidate activities

-- 1. Create status history table for candidates
CREATE TABLE IF NOT EXISTS candidate_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  old_status VARCHAR(100),
  new_status VARCHAR(100) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  duration_in_status INTERVAL,
  notes TEXT
);

-- 2. Create status history table for clients
CREATE TABLE IF NOT EXISTS client_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  old_status VARCHAR(100),
  new_status VARCHAR(100) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  duration_in_status INTERVAL,
  notes TEXT
);

-- 3. Create placement activity log table
CREATE TABLE IF NOT EXISTS placement_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id UUID REFERENCES client_placements(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  activity_description TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- 4. Function to track candidate status changes
CREATE OR REPLACE FUNCTION track_candidate_status_change()
RETURNS TRIGGER AS $$
DECLARE
  duration_val INTERVAL;
  last_change TIMESTAMPTZ;
BEGIN
  -- Calculate duration in previous status
  SELECT changed_at INTO last_change 
  FROM candidate_status_history 
  WHERE candidate_id = NEW.id 
  ORDER BY changed_at DESC 
  LIMIT 1;
  
  IF last_change IS NOT NULL THEN
    duration_val := NOW() - last_change;
  END IF;

  -- Insert status history record
  INSERT INTO candidate_status_history (
    candidate_id, old_status, new_status, changed_by, duration_in_status
  ) VALUES (
    NEW.id, OLD.status, NEW.status, NEW.updated_by, duration_val
  );

  -- Insert activity log
  INSERT INTO updates (
    linked_to_type, linked_to_id, user_id, update_text, created_at
  ) VALUES (
    'candidate', NEW.id, NEW.updated_by, 
    'Status changed from ' || COALESCE(OLD.status, 'None') || ' to ' || NEW.status,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to track client status changes
CREATE OR REPLACE FUNCTION track_client_status_change()
RETURNS TRIGGER AS $$
DECLARE
  duration_val INTERVAL;
  last_change TIMESTAMPTZ;
BEGIN
  -- Calculate duration in previous status
  SELECT changed_at INTO last_change 
  FROM client_status_history 
  WHERE client_id = NEW.id 
  ORDER BY changed_at DESC 
  LIMIT 1;
  
  IF last_change IS NOT NULL THEN
    duration_val := NOW() - last_change;
  END IF;

  -- Insert status history record
  INSERT INTO client_status_history (
    client_id, old_status, new_status, changed_by, duration_in_status
  ) VALUES (
    NEW.id, OLD.status, NEW.status, NEW.updated_by, duration_val
  );

  -- Insert activity log
  INSERT INTO updates (
    linked_to_type, linked_to_id, user_id, update_text, created_at
  ) VALUES (
    'client', NEW.id, NEW.updated_by, 
    'Status changed from ' || COALESCE(OLD.status, 'None') || ' to ' || NEW.status,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to log placement activities
CREATE OR REPLACE FUNCTION log_placement_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log placement creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO placement_activity_log (
      placement_id, client_id, activity_type, activity_description, performed_by, metadata
    ) VALUES (
      NEW.id, NEW.client_id, 'placement_created', 
      'Placement created for candidate: ' || NEW.candidate_name,
      NEW.created_by, 
      jsonb_build_object('candidate_id', NEW.candidate_id, 'placement_order', NEW.placement_order)
    );
    RETURN NEW;
  END IF;

  -- Log placement updates
  IF TG_OP = 'UPDATE' THEN
    IF OLD.outcome != NEW.outcome THEN
      INSERT INTO placement_activity_log (
        placement_id, client_id, activity_type, activity_description, performed_by, metadata
      ) VALUES (
        NEW.id, NEW.client_id, 'outcome_changed',
        'Placement outcome changed from ' || OLD.outcome || ' to ' || NEW.outcome,
        NEW.updated_by,
        jsonb_build_object('old_outcome', OLD.outcome, 'new_outcome', NEW.outcome)
      );
    END IF;

    IF OLD.candidate_id != NEW.candidate_id THEN
      INSERT INTO placement_activity_log (
        placement_id, client_id, activity_type, activity_description, performed_by, metadata
      ) VALUES (
        NEW.id, NEW.client_id, 'candidate_changed',
        'Placement candidate changed from ' || OLD.candidate_name || ' to ' || NEW.candidate_name,
        NEW.updated_by,
        jsonb_build_object('old_candidate_id', OLD.candidate_id, 'new_candidate_id', NEW.candidate_id)
      );
    END IF;
    RETURN NEW;
  END IF;

  -- Log placement deletion
  IF TG_OP = 'DELETE' THEN
    INSERT INTO placement_activity_log (
      placement_id, client_id, activity_type, activity_description, performed_by, metadata
    ) VALUES (
      OLD.id, OLD.client_id, 'placement_deleted',
      'Placement deleted for candidate: ' || OLD.candidate_name,
      OLD.updated_by,
      jsonb_build_object('candidate_id', OLD.candidate_id, 'outcome', OLD.outcome)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to log follow-up activities
CREATE OR REPLACE FUNCTION log_followup_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO placement_activity_log (
      placement_id, client_id, activity_type, activity_description, performed_by, metadata
    ) VALUES (
      NEW.placement_id, NEW.client_id, 'followup_scheduled',
      'Follow-up scheduled: ' || NEW.followup_type || ' for ' || NEW.scheduled_date,
      NEW.created_by,
      jsonb_build_object('followup_type', NEW.followup_type, 'scheduled_date', NEW.scheduled_date)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.completed = FALSE AND NEW.completed = TRUE THEN
    INSERT INTO placement_activity_log (
      placement_id, client_id, activity_type, activity_description, performed_by, metadata
    ) VALUES (
      NEW.placement_id, NEW.client_id, 'followup_completed',
      'Follow-up completed: ' || NEW.followup_type || ' - ' || COALESCE(NEW.notes, 'No notes'),
      NEW.updated_by,
      jsonb_build_object('followup_type', NEW.followup_type, 'completion_date', NEW.completed_at, 'notes', NEW.notes)
    );
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Add updated_by columns to track who made changes
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE client_placements ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE client_placements ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE placement_followups ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE placement_followups ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- 9. Create triggers
DROP TRIGGER IF EXISTS candidate_status_change_trigger ON candidates;
CREATE TRIGGER candidate_status_change_trigger
  AFTER UPDATE OF status ON candidates
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION track_candidate_status_change();

DROP TRIGGER IF EXISTS client_status_change_trigger ON clients;
CREATE TRIGGER client_status_change_trigger
  AFTER UPDATE OF status ON clients
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION track_client_status_change();

DROP TRIGGER IF EXISTS placement_activity_trigger ON client_placements;
CREATE TRIGGER placement_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON client_placements
  FOR EACH ROW
  EXECUTE FUNCTION log_placement_activity();

DROP TRIGGER IF EXISTS followup_activity_trigger ON placement_followups;
CREATE TRIGGER followup_activity_trigger
  AFTER INSERT OR UPDATE ON placement_followups
  FOR EACH ROW
  EXECUTE FUNCTION log_followup_activity();

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS candidate_status_history_candidate_id_idx ON candidate_status_history(candidate_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS client_status_history_client_id_idx ON client_status_history(client_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS placement_activity_log_placement_id_idx ON placement_activity_log(placement_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS placement_activity_log_client_id_idx ON placement_activity_log(client_id, performed_at DESC);