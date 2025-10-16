-- Add source column to clients table if it doesn't exist
-- Run this SQL script in your Supabase SQL editor

-- STEP 1: Ensure the want_to_hire column exists (should exist from previous migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'want_to_hire'
  ) THEN
    ALTER TABLE clients ADD COLUMN want_to_hire text DEFAULT 'Caregiver';
  END IF;
END $$;

-- STEP 2: Add source column
ALTER TABLE clients ADD COLUMN IF NOT EXISTS source text DEFAULT 'Referral';

-- STEP 3: Update existing records to have default source
UPDATE clients SET source = 'Referral' WHERE source IS NULL;

-- STEP 4: Make source column NOT NULL after setting defaults
ALTER TABLE clients ALTER COLUMN source SET NOT NULL;

-- STEP 5: Add check constraint for source values (same as candidates table)
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_source_check;
ALTER TABLE clients ADD CONSTRAINT clients_source_check 
  CHECK (source IN ('TikTok', 'Facebook', 'Instagram', 'Google Search', 'Website', 'Referral', 'LinkedIn', 'Walk-in poster'));

-- STEP 6: Add check constraint for want_to_hire values (updated role options)
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_want_to_hire_check;
ALTER TABLE clients ADD CONSTRAINT clients_want_to_hire_check 
  CHECK (want_to_hire IN ('Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver'));

-- STEP 7: Update existing want_to_hire values to match valid options (map old to new)
UPDATE clients SET want_to_hire = 'Caregiver' WHERE want_to_hire NOT IN ('Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver');

-- STEP 8: Also update candidates table role column to use same options
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_role_check;
ALTER TABLE candidates ADD CONSTRAINT candidates_role_check 
  CHECK (role IN ('Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver'));

-- STEP 9: Update existing candidate roles to match valid options (map old to new)
UPDATE candidates SET role = 'Caregiver' WHERE role NOT IN ('Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver');

-- STEP 10: Create index for source column
CREATE INDEX IF NOT EXISTS clients_source_idx ON clients(source);

-- STEP 11: Verify the changes
SELECT 'clients' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clients' AND column_name IN ('source', 'want_to_hire')
UNION ALL
SELECT 'candidates' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'candidates' AND column_name = 'role'
ORDER BY table_name, column_name;