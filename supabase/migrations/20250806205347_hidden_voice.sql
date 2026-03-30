/*
  # Fix Foreign Key References

  1. Changes
    - Update all foreign key references from auth.users(id) to staff(id)
    - Ensure scheduled_date column exists in candidates table
    - Fix relationship issues for PostgREST joins

  2. Tables Updated
    - candidates: assigned_to, scheduled_date
    - clients: assigned_to  
    - training_leads: assigned_to
    - interviews: assigned_staff
    - updates: user_id
    - communications: user_id, follow_up_assigned_to

  3. Security
    - Maintain existing RLS policies
*/

-- First, ensure staff table exists (should already exist from staff.sql migration)
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  auth_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Ensure scheduled_date column exists in candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS scheduled_date date;

-- Drop existing foreign key constraints and recreate with staff references
-- Note: This assumes tables exist and may need to be adjusted based on actual schema

-- Update candidates table
DO $$
BEGIN
  -- Drop existing foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%candidates_assigned_to_fkey%'
  ) THEN
    ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_assigned_to_fkey;
  END IF;
  
  -- Add new foreign key constraint
  ALTER TABLE candidates ADD CONSTRAINT candidates_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES staff(id);
END $$;

-- Update clients table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%clients_assigned_to_fkey%'
  ) THEN
    ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_assigned_to_fkey;
  END IF;
  
  ALTER TABLE clients ADD CONSTRAINT clients_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES staff(id);
END $$;

-- Update training_leads table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%training_leads_assigned_to_fkey%'
  ) THEN
    ALTER TABLE training_leads DROP CONSTRAINT IF EXISTS training_leads_assigned_to_fkey;
  END IF;
  
  ALTER TABLE training_leads ADD CONSTRAINT training_leads_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES staff(id);
END $$;

-- Update interviews table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%interviews_assigned_staff_fkey%'
  ) THEN
    ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_assigned_staff_fkey;
  END IF;
  
  ALTER TABLE interviews ADD CONSTRAINT interviews_assigned_staff_fkey 
    FOREIGN KEY (assigned_staff) REFERENCES staff(id);
END $$;

-- Update updates table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%updates_user_id_fkey%'
  ) THEN
    ALTER TABLE updates DROP CONSTRAINT IF EXISTS updates_user_id_fkey;
  END IF;
  
  ALTER TABLE updates ADD CONSTRAINT updates_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES staff(id);
END $$;

-- Update communications table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%communications_user_id_fkey%'
  ) THEN
    ALTER TABLE communications DROP CONSTRAINT IF EXISTS communications_user_id_fkey;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%communications_follow_up_assigned_to_fkey%'
  ) THEN
    ALTER TABLE communications DROP CONSTRAINT IF EXISTS communications_follow_up_assigned_to_fkey;
  END IF;
  
  ALTER TABLE communications ADD CONSTRAINT communications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES staff(id);
    
  ALTER TABLE communications ADD CONSTRAINT communications_follow_up_assigned_to_fkey 
    FOREIGN KEY (follow_up_assigned_to) REFERENCES staff(id);
END $$;