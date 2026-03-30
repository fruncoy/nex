/*
  # Add Source Column to Clients Table

  1. Schema Changes
    - Add source column to clients table (same as candidates table)
    - Update want_to_hire to use exact role options from candidates
    - Add check constraints for valid values

  2. Source Options (from candidates table)
    - TikTok, Facebook, Instagram, Google Search, Website, Referral, LinkedIn, Walk-in poster

  3. Role Options (from candidates table)  
    - Nanny, House Manager, Chef, Driver, AOB, Caregiver, General, Other
*/

-- Add source column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS source text;

-- Set default source for existing records
UPDATE clients SET source = 'Referral' WHERE source IS NULL;

-- Make source column NOT NULL after setting defaults
ALTER TABLE clients ALTER COLUMN source SET NOT NULL;

-- Add check constraint for source values (same as candidates table)
ALTER TABLE clients ADD CONSTRAINT clients_source_check 
  CHECK (source IN ('TikTok', 'Facebook', 'Instagram', 'Google Search', 'Website', 'Referral', 'LinkedIn', 'Walk-in poster'));

-- Add check constraint for want_to_hire values (updated role options)
ALTER TABLE clients ADD CONSTRAINT clients_want_to_hire_check 
  CHECK (want_to_hire IN ('Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver'));

-- Update existing want_to_hire values to match valid options (map old to new)
UPDATE clients SET want_to_hire = 'Caregiver' WHERE want_to_hire NOT IN ('Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver');

-- Also update candidates table role column to use same options
ALTER TABLE candidates ADD CONSTRAINT candidates_role_check 
  CHECK (role IN ('Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver'));

-- Update existing candidate roles to match valid options (map old to new)
UPDATE candidates SET role = 'Caregiver' WHERE role NOT IN ('Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver');

-- Create index for source column
CREATE INDEX IF NOT EXISTS clients_source_idx ON clients(source);