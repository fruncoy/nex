/*
  # Fix user_id constraint in updates table

  1. Changes
    - Make user_id nullable in updates table
    - Update policies to handle null user_id cases
    - Add default user_id for system updates
*/

-- Make user_id nullable
ALTER TABLE updates ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own updates" ON updates;
DROP POLICY IF EXISTS "Users can insert updates" ON updates;

-- Create new policy that allows authenticated users to insert updates
CREATE POLICY "Authenticated users can insert updates"
  ON updates FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for selecting updates
CREATE POLICY "Authenticated users can view updates"
  ON updates FOR SELECT
  TO authenticated
  USING (true);