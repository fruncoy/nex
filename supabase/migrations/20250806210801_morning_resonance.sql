/*
  # Fix Schema References and Add Missing Columns

  1. Schema Changes
    - Ensure scheduled_date column exists in candidates table
    - Update all foreign key references from auth.users(id) to staff(id)
    - Fix relationship issues for proper database integrity

  2. Tables Updated
    - candidates: scheduled_date column, assigned_to reference
    - clients: assigned_to reference
    - training_leads: assigned_to reference
    - interviews: assigned_staff reference
    - updates: user_id reference
    - communications: user_id and follow_up_assigned_to references

  3. Security
    - Maintain existing RLS policies
*/

-- Ensure the scheduled_date column is properly added to candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS scheduled_date date;

-- Drop and recreate foreign key constraints to reference staff table instead of auth.users

-- Update candidates table foreign key
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'candidates_assigned_to_fkey' 
    AND table_name = 'candidates'
  ) THEN
    ALTER TABLE candidates DROP CONSTRAINT candidates_assigned_to_fkey;
  END IF;
  
  -- Add new constraint referencing staff table
  ALTER TABLE candidates ADD CONSTRAINT candidates_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES staff(id);
END $$;

-- Update clients table foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'clients_assigned_to_fkey' 
    AND table_name = 'clients'
  ) THEN
    ALTER TABLE clients DROP CONSTRAINT clients_assigned_to_fkey;
  END IF;
  
  ALTER TABLE clients ADD CONSTRAINT clients_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES staff(id);
END $$;

-- Update training_leads table foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'training_leads_assigned_to_fkey' 
    AND table_name = 'training_leads'
  ) THEN
    ALTER TABLE training_leads DROP CONSTRAINT training_leads_assigned_to_fkey;
  END IF;
  
  ALTER TABLE training_leads ADD CONSTRAINT training_leads_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES staff(id);
END $$;

-- Update interviews table foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'interviews_assigned_staff_fkey' 
    AND table_name = 'interviews'
  ) THEN
    ALTER TABLE interviews DROP CONSTRAINT interviews_assigned_staff_fkey;
  END IF;
  
  ALTER TABLE interviews ADD CONSTRAINT interviews_assigned_staff_fkey 
    FOREIGN KEY (assigned_staff) REFERENCES staff(id);
END $$;

-- Update updates table foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'updates_user_id_fkey' 
    AND table_name = 'updates'
  ) THEN
    ALTER TABLE updates DROP CONSTRAINT updates_user_id_fkey;
  END IF;
  
  ALTER TABLE updates ADD CONSTRAINT updates_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES staff(id);
END $$;

-- Update communications table foreign keys
DO $$
BEGIN
  -- Update user_id foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'communications_user_id_fkey' 
    AND table_name = 'communications'
  ) THEN
    ALTER TABLE communications DROP CONSTRAINT communications_user_id_fkey;
  END IF;
  
  ALTER TABLE communications ADD CONSTRAINT communications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES staff(id);
  
  -- Update follow_up_assigned_to foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'communications_follow_up_assigned_to_fkey' 
    AND table_name = 'communications'
  ) THEN
    ALTER TABLE communications DROP CONSTRAINT communications_follow_up_assigned_to_fkey;
  END IF;
  
  ALTER TABLE communications ADD CONSTRAINT communications_follow_up_assigned_to_fkey 
    FOREIGN KEY (follow_up_assigned_to) REFERENCES staff(id);
END $$;

-- Create indexes for better performance on the new foreign key relationships
CREATE INDEX IF NOT EXISTS candidates_assigned_to_idx ON candidates(assigned_to);
CREATE INDEX IF NOT EXISTS clients_assigned_to_idx ON clients(assigned_to);
CREATE INDEX IF NOT EXISTS training_leads_assigned_to_idx ON training_leads(assigned_to);
CREATE INDEX IF NOT EXISTS interviews_assigned_staff_idx ON interviews(assigned_staff);
CREATE INDEX IF NOT EXISTS updates_user_id_idx ON updates(user_id);
CREATE INDEX IF NOT EXISTS communications_user_id_idx ON communications(user_id);
CREATE INDEX IF NOT EXISTS communications_follow_up_assigned_to_idx ON communications(follow_up_assigned_to);