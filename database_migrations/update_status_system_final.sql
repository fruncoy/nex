-- Final status system update - migrate existing data and update constraints
-- This preserves all existing data while standardizing to the new status system

-- Step 1: Update existing statuses to new standardized format
UPDATE clients SET status = 'Pending - No communication' WHERE status = 'Pending - No Comms';
UPDATE clients SET status = 'Active - Reviewing Profiles' WHERE status = 'Active - Communication ongoing';
UPDATE clients SET status = 'Active - Reviewing Profiles' WHERE status = 'Communication Ongoing';
UPDATE clients SET status = 'Active - Reviewing Profiles' WHERE status = 'Reviewing Profiles';
UPDATE clients SET status = 'Active - Conducting Trials' WHERE status = 'Conducting Trials';
UPDATE clients SET status = 'Active - Payment Pending' WHERE status = 'Payment Pending';
UPDATE clients SET status = 'Active - Payment Pending' WHERE status = 'Active - Payment pending';
UPDATE clients SET status = 'Lost - Ghosted' WHERE status = 'Lost/Cold - Ghosted';
UPDATE clients SET status = 'Lost - Budget' WHERE status = 'Lost/Cold - Budget constraints';
UPDATE clients SET status = 'Lost - Disappointed With Profiles' WHERE status = 'Lost/Cold - Disappointed with profiles';
UPDATE clients SET status = 'Lost - Competition' WHERE status = 'Lost/Cold - Lost to Competition';
UPDATE clients SET status = 'Active - Reviewing Profiles' WHERE status = 'Active - Form filled, no response yet';
UPDATE clients SET status = 'Pending - PAF not paid' WHERE status = 'Pending - PAF not PAID';
UPDATE clients SET status = 'Pending - Lead Status: Lost' WHERE status = 'Pending - Silent after profiles';
-- Map simple statuses
UPDATE clients SET status = 'Pending - No communication' WHERE status = 'Pending';

-- Step 2: Update status constraint to only allow the new standardized statuses
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_status_check 
  CHECK (status IN (
    -- Lead statuses
    'Pending - No communication',
    'Pending - Form not filled', 
    'Pending - PAF not paid',
    'Pending - Lead Status: Lost',
    'Lost - Budget',
    'Lost - Competition', 
    'Lost - Ghosted',
    
    -- Client and Lead statuses
    'Active - Reviewing Profiles',
    'Active - Conducting Trials',
    'Active - Payment Pending', 
    'Active - But Dormant',
    'Won',
    'Lost - Disappointed With Profiles',
    'Lost - Conflict of Interest',
    'Lost - Ghosted',
    'Lost - Competition',
    
    -- Converted Client statuses (Won)
    'Active',
    'Lost (Refunded)',
    'Lost (Not Refunded)',
    
    -- Legacy statuses (temporary - for gradual migration)
    'Pending', 'Lost', 'Client - Active', 'Client - Reviewing Profiles', 
    'Client - Profile Sent but no response', 'Client - Conducting Trials', 
    'Client - Payment Pending', 'Client - Won', 'Client - Lost'
  ));

-- Step 3: Create helper functions for status categorization
CREATE OR REPLACE FUNCTION is_lead_status(client_status text) 
RETURNS boolean AS $$
BEGIN
  RETURN client_status IN (
    'Pending - No communication',
    'Pending - Form not filled', 
    'Pending - PAF not paid',
    'Pending - Lead Status: Lost',
    'Lost - Budget',
    'Lost - Competition', 
    'Lost - Ghosted'
  ) OR client_status LIKE 'Pending%';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_client_status(client_status text)
RETURNS boolean AS $$
BEGIN
  RETURN client_status IN (
    'Active - Reviewing Profiles',
    'Active - Conducting Trials',
    'Active - Payment Pending', 
    'Active - But Dormant',
    'Won',
    'Lost - Disappointed With Profiles',
    'Lost - Conflict of Interest'
  ) OR client_status LIKE 'Active%' OR client_status = 'Won';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_converted_client_status(client_status text)
RETURNS boolean AS $$
BEGIN
  RETURN client_status IN (
    'Active',
    'Lost (Refunded)',
    'Lost (Not Refunded)'
  );
END;
$$ LANGUAGE plpgsql;

-- Step 4: Add comments for clarity
COMMENT ON CONSTRAINT clients_status_check ON clients IS 'Enforces standardized status system: Lead statuses, Client/Lead statuses, and Converted Client statuses';