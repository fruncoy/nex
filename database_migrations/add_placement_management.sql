-- Add placement management features for converted clients

-- 1. Update clients table to set default status to "Pending - No Comms"
ALTER TABLE clients ALTER COLUMN status SET DEFAULT 'Pending - No Comms';

-- Update status constraint to include "No Comms" substatus
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_status_check 
  CHECK (status IN (
    'Pending', 'Pending - Form not filled', 'Pending - PAF not PAID', 'Pending - Silent after profiles', 'Pending - No Comms',
    'Active', 'Active - Form filled, no response yet', 'Active - Communication ongoing', 'Active - Payment pending',
    'Lost/Cold', 'Lost/Cold - Ghosted', 'Lost/Cold - Budget constraints', 'Lost/Cold - Disappointed with profiles', 'Lost/Cold - Lost to Competition',
    'Won'
  ));

-- 2. Add placement management columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS placement_fee DECIMAL(10,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS placement_status VARCHAR(50) DEFAULT 'Active';

-- Add constraint for placement status
ALTER TABLE clients ADD CONSTRAINT clients_placement_status_check 
  CHECK (placement_status IN ('Active', 'Refunded', 'Lost (Refunded)', 'Lost (No Refund)'));

-- 3. Create placement follow-up tracking table
CREATE TABLE IF NOT EXISTS placement_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  placement_id UUID NOT NULL REFERENCES client_placements(id) ON DELETE CASCADE,
  followup_type VARCHAR(20) NOT NULL CHECK (followup_type IN ('1_week', '2_week', '3_week', '1_month')),
  scheduled_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS placement_followups_client_id_idx ON placement_followups(client_id);
CREATE INDEX IF NOT EXISTS placement_followups_placement_id_idx ON placement_followups(placement_id);
CREATE INDEX IF NOT EXISTS placement_followups_scheduled_date_idx ON placement_followups(scheduled_date);
CREATE INDEX IF NOT EXISTS placement_followups_completed_idx ON placement_followups(completed, scheduled_date);

-- 5. Create trigger to auto-create follow-ups when placement is added
CREATE OR REPLACE FUNCTION create_placement_followups()
RETURNS TRIGGER AS $$
BEGIN
  -- Create follow-up reminders for 1 week, 2 weeks, and 3 weeks after placement start
  INSERT INTO placement_followups (client_id, placement_id, followup_type, scheduled_date)
  VALUES 
    (NEW.client_id, NEW.id, '1_week', NEW.start_date::date + INTERVAL '1 week'),
    (NEW.client_id, NEW.id, '2_week', NEW.start_date::date + INTERVAL '2 weeks'),
    (NEW.client_id, NEW.id, '3_week', NEW.start_date::date + INTERVAL '3 weeks');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS placement_followups_trigger ON client_placements;

-- Create trigger
CREATE TRIGGER placement_followups_trigger
  AFTER INSERT ON client_placements
  FOR EACH ROW
  EXECUTE FUNCTION create_placement_followups();

-- 6. Add updated_at trigger for placement_followups
CREATE OR REPLACE FUNCTION update_placement_followups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER placement_followups_updated_at_trigger
  BEFORE UPDATE ON placement_followups
  FOR EACH ROW
  EXECUTE FUNCTION update_placement_followups_updated_at();

-- 7. Create view for placement follow-up dashboard
CREATE OR REPLACE VIEW placement_followup_dashboard AS
SELECT 
  pf.id,
  pf.client_id,
  c.name as client_name,
  pf.placement_id,
  cp.candidate_name,
  pf.followup_type,
  pf.scheduled_date,
  pf.completed,
  pf.completed_at,
  pf.notes,
  CASE 
    WHEN pf.scheduled_date < CURRENT_DATE AND NOT pf.completed THEN 'overdue'
    WHEN pf.scheduled_date = CURRENT_DATE AND NOT pf.completed THEN 'due_today'
    WHEN pf.scheduled_date > CURRENT_DATE AND NOT pf.completed THEN 'upcoming'
    ELSE 'completed'
  END as status,
  pf.created_at,
  pf.updated_at
FROM placement_followups pf
JOIN clients c ON pf.client_id = c.id
JOIN client_placements cp ON pf.placement_id = cp.id
ORDER BY pf.scheduled_date ASC, pf.created_at ASC;

-- 8. Insert default "No Comms" status for existing Pending clients
UPDATE clients 
SET status = 'Pending - No Comms' 
WHERE status = 'Pending' AND created_at < NOW();