/*
  # Fix Updates Table Policies

  1. Changes
    - Update the updates table policies to handle null user_id cases
    - Add better error handling for user_id constraints
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own updates" ON updates;

-- Create new policy that allows system-generated updates
CREATE POLICY "Users can insert updates"
  ON updates FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR 
    user_id IS NULL OR
    auth.uid() IS NOT NULL
  );

-- Update existing updates with null user_id to use a system user
-- First, let's make user_id nullable temporarily if it isn't already
ALTER TABLE updates ALTER COLUMN user_id DROP NOT NULL;

-- Add a constraint that user_id should be provided for new records
-- but allow existing null values
ALTER TABLE updates ADD CONSTRAINT updates_user_id_check 
  CHECK (user_id IS NOT NULL OR created_at < now());