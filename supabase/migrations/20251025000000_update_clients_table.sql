/*
  # Update Clients Table for Enhanced Management

  1. Schema Changes
    - Keep only: name, phone, gmail, want_to_hire, status, inquiry_date
    - Add custom_reminder_datetime for manual reminders
    - Remove all other columns not specified

  2. Status System (Exact as specified)
    - Pending: Form not filled, PFA not paid, Silent after profiles
    - Active: Form filled no response, Communication ongoing, Payment pending  
    - Lost/Cold: Ghosted, Budget constraints, Disappointed with profiles
    - Won: Success status

  3. Reminder Logic
    - Custom reminder datetime for manual alerts
    - Auto-flagging: Pending > 3 days, Active > 7 days without update
*/

-- Add new columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gmail text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS want_to_hire text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS custom_reminder_datetime timestamptz;

-- Migrate existing data (only if old columns exist)
DO $$
BEGIN
  -- Check if old schema columns exist and migrate data
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'name_company'
  ) THEN
    UPDATE clients 
    SET name = COALESCE(name_company, 'Unknown Client'),
        phone = CASE 
          WHEN contact_info LIKE '%/%' THEN TRIM(split_part(contact_info, '/', 2))
          WHEN contact_info NOT LIKE '%@%' THEN contact_info
          ELSE 'No phone'
        END,
        gmail = CASE 
          WHEN contact_info LIKE '%@%' AND contact_info LIKE '%/%' THEN TRIM(split_part(contact_info, '/', 1))
          WHEN contact_info LIKE '%@%' AND contact_info NOT LIKE '%/%' THEN contact_info
          ELSE 'no-email@example.com'
        END,
        want_to_hire = COALESCE(role_requested, 'Caregiver')
    WHERE name IS NULL;
  ELSE
    -- If old columns don't exist, set default values for new columns
    UPDATE clients 
    SET name = COALESCE(name, 'Unknown Client'),
        phone = COALESCE(phone, 'No phone'),
        gmail = COALESCE(gmail, 'no-email@example.com'),
        want_to_hire = COALESCE(want_to_hire, 'Caregiver')
    WHERE name IS NULL OR phone IS NULL OR gmail IS NULL OR want_to_hire IS NULL;
  END IF;
END $$;

-- Final verification: Check constraints and schema
SELECT 
  'clients_constraints' as check_type,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'clients' AND constraint_type = 'CHECK'
ORDER BY constraint_name;

-- Verification: Check final schema
SELECT 
  'clients_final_schema' as check_type,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'clients' 
ORDER BY ordinal_position;

-- Clean up and normalize existing status values to new system
-- First, handle any null or empty statuses
UPDATE clients SET status = 'Pending' WHERE status IS NULL OR status = '';

-- Map old statuses to new ones - only the exact statuses you specified
UPDATE clients SET status = 'Pending' WHERE status IN ('pending', 'new');
UPDATE clients SET status = 'Active' WHERE status IN ('will-call-back', 'contacted', 'requirements-gathered', 'profiles-sent', 'proposals-sent');
UPDATE clients SET status = 'Lost/Cold' WHERE status IN ('closed-lost', 'lost', 'cold');
UPDATE clients SET status = 'Won' WHERE status IN ('won', 'hired', 'completed', 'success');

-- Remove all call-again statuses and map them to Pending
UPDATE clients SET status = 'Pending' WHERE status LIKE '%call-again%';

-- Handle any remaining unmapped statuses - set to Pending as default
UPDATE clients SET status = 'Pending' WHERE status NOT IN (
  'Pending', 'Form not filled', 'PFA not paid', 'Silent after profiles',
  'Active', 'Form filled, no response yet', 'Communication ongoing', 'Payment pending',
  'Lost/Cold', 'Ghosted', 'Budget constraints', 'Disappointed with profiles',
  'Won'
);

-- Make new columns NOT NULL after data migration
ALTER TABLE clients ALTER COLUMN name SET NOT NULL;
ALTER TABLE clients ALTER COLUMN phone SET NOT NULL;
ALTER TABLE clients ALTER COLUMN gmail SET NOT NULL;
ALTER TABLE clients ALTER COLUMN want_to_hire SET NOT NULL;

-- Add check constraint for new status values (exact as specified)
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_status_check 
  CHECK (status IN (
    'Pending', 'Form not filled', 'PFA not paid', 'Silent after profiles',
    'Active', 'Form filled, no response yet', 'Communication ongoing', 'Payment pending',
    'Lost/Cold', 'Ghosted', 'Budget constraints', 'Disappointed with profiles',
    'Won'
  ));

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS clients_custom_reminder_datetime_idx ON clients(custom_reminder_datetime);
CREATE INDEX IF NOT EXISTS clients_status_created_at_idx ON clients(status, created_at);
CREATE INDEX IF NOT EXISTS clients_status_updated_at_idx ON clients(status, updated_at);

-- Add updated_at column for tracking status changes
ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger to update updated_at on status changes
DROP TRIGGER IF EXISTS clients_status_updated_at ON clients;

CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_status_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at();

-- Remove columns not specified in requirements (only if they exist)
DO $$
BEGIN
  -- Drop old schema columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'name_company'
  ) THEN
    ALTER TABLE clients DROP COLUMN name_company;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'contact_info'
  ) THEN
    ALTER TABLE clients DROP COLUMN contact_info;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'role_requested'
  ) THEN
    ALTER TABLE clients DROP COLUMN role_requested;
  END IF;
  
  -- Drop other old columns if they exist
  ALTER TABLE clients DROP COLUMN IF EXISTS reminder_date;
  ALTER TABLE clients DROP COLUMN IF EXISTS follow_up_datetime;
  ALTER TABLE clients DROP COLUMN IF EXISTS custom_reminder_note;
  ALTER TABLE clients DROP COLUMN IF EXISTS reminder_completed;
  ALTER TABLE clients DROP COLUMN IF EXISTS reminder_completed_at;
  ALTER TABLE clients DROP COLUMN IF EXISTS assigned_to;
  ALTER TABLE clients DROP COLUMN IF EXISTS notes;
END $$;