-- Remove plain status options and update notes system

-- 1. Update clients status constraint to remove plain "Pending"
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_status_check 
  CHECK (status IN (
    'Pending - Form not filled', 'Pending - PAF not PAID', 'Pending - Silent after profiles', 'Pending - No Comms',
    'Active - Form filled, no response yet', 'Active - Communication ongoing', 'Active - Payment pending',
    'Lost/Cold - Ghosted', 'Lost/Cold - Budget constraints', 'Lost/Cold - Disappointed with profiles', 'Lost/Cold - Lost to Competition',
    'Won'
  ));

-- 2. Update placement status constraint to remove plain "Refunded"
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_placement_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_placement_status_check 
  CHECK (placement_status IN ('Active', 'Lost (Refunded)', 'Lost (No Refund)'));

-- 3. Update existing plain statuses
UPDATE clients SET status = 'Pending - No Comms' WHERE status = 'Pending';
UPDATE clients SET placement_status = 'Lost (Refunded)' WHERE placement_status = 'Refunded';

-- Update clients table default status
ALTER TABLE clients ALTER COLUMN status SET DEFAULT 'Pending - No Comms';

-- 4. Add read tracking to client_notes
ALTER TABLE client_notes ADD COLUMN IF NOT EXISTS read_by JSONB DEFAULT '{}';

-- 5. Add read tracking to candidate_notes (create table if not exists)
CREATE TABLE IF NOT EXISTS candidate_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_by JSONB DEFAULT '{}'
);

-- 6. Create indexes for notes tables
CREATE INDEX IF NOT EXISTS client_notes_client_id_idx ON client_notes(client_id);
CREATE INDEX IF NOT EXISTS client_notes_created_at_idx ON client_notes(created_at);
CREATE INDEX IF NOT EXISTS candidate_notes_candidate_id_idx ON candidate_notes(candidate_id);
CREATE INDEX IF NOT EXISTS candidate_notes_created_at_idx ON candidate_notes(created_at);

-- 7. Create function to get unread notes count
CREATE OR REPLACE FUNCTION get_unread_notes_count(entity_type TEXT, entity_id UUID, user_name TEXT)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER := 0;
BEGIN
  IF entity_type = 'client' THEN
    SELECT COUNT(*) INTO unread_count
    FROM client_notes 
    WHERE client_id = entity_id 
    AND NOT (read_by ? user_name);
  ELSIF entity_type = 'candidate' THEN
    SELECT COUNT(*) INTO unread_count
    FROM candidate_notes 
    WHERE candidate_id = entity_id 
    AND NOT (read_by ? user_name);
  END IF;
  
  RETURN unread_count;
END;
$$ LANGUAGE plpgsql;