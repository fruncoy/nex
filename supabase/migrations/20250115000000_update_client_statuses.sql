-- Simple update to client statuses without creating new tables
-- Keep existing clients table, just update status constraints and add PAF paid date

-- Add PAF paid date column if it doesn't exist
ALTER TABLE clients ADD COLUMN IF NOT EXISTS paf_paid_date date;

-- Add lost reason columns
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lost_reason text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lost_reason_other text;

-- Update status constraint to include all possible statuses
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_status_check 
  CHECK (status IN (
    -- New simplified statuses
    'Pending', 'Lost', 'Active', 'Reviewing Profiles', 'Profile Sent but no response', 
    'Conducting Trials', 'Payment Pending', 'Won',
    -- Legacy statuses (keep for existing data)
    'Pending - No Comms', 'Pending - Form not filled', 'Pending - PAF not PAID', 'Pending - Silent after profiles',
    'Active - Form filled, no response yet', 'Active - Communication ongoing', 'Active - Payment pending',
    'Lost/Cold - Ghosted', 'Lost/Cold - Budget constraints', 'Lost/Cold - Disappointed with profiles', 'Lost/Cold - Lost to Competition'
  ));

-- Create index for PAF paid date
CREATE INDEX IF NOT EXISTS clients_paf_paid_date_idx ON clients(paf_paid_date);

-- Function to determine if a client is a lead or client based on status
CREATE OR REPLACE FUNCTION is_lead(client_status text) 
RETURNS boolean AS $$
BEGIN
  RETURN client_status IN ('Pending', 'Lost') OR client_status LIKE 'Pending -%';
END;
$$ LANGUAGE plpgsql;

-- Function to determine if a client is an active client based on status  
CREATE OR REPLACE FUNCTION is_client(client_status text)
RETURNS boolean AS $$
BEGIN
  RETURN client_status IN ('Active', 'Reviewing Profiles', 'Profile Sent but no response', 
                          'Conducting Trials', 'Payment Pending', 'Won') 
         OR client_status LIKE 'Active -%' 
         OR client_status = 'Won';
END;
$$ LANGUAGE plpgsql;