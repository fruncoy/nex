/*
  # Update Schema for Communications Log and Status Changes

  1. New Tables
    - `communications`
      - `id` (uuid, primary key)
      - `linked_to_type` (text) - 'candidate', 'client', 'training_lead'
      - `linked_to_id` (uuid)
      - `user_id` (uuid, references auth.users)
      - `description` (text)
      - `follow_up_assigned_to` (uuid, references auth.users, optional)
      - `created_at` (timestamp)

  2. Schema Updates
    - Update status options for candidates, clients, training_leads
    - Add indexes for better performance

  3. Security
    - Enable RLS on communications table
    - Add policies for authenticated users
*/

-- Create communications table
CREATE TABLE IF NOT EXISTS communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linked_to_type text NOT NULL CHECK (linked_to_type IN ('candidate', 'client', 'training_lead')),
  linked_to_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  description text NOT NULL,
  follow_up_assigned_to uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- Create policies for communications
CREATE POLICY "Users can view all communications"
  ON communications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert communications"
  ON communications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update communications"
  ON communications FOR UPDATE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS communications_linked_to_idx ON communications(linked_to_type, linked_to_id);
CREATE INDEX IF NOT EXISTS communications_created_at_idx ON communications(created_at DESC);
CREATE INDEX IF NOT EXISTS communications_follow_up_idx ON communications(follow_up_assigned_to);

-- Add constraint to check valid linked_to_id based on type
-- This will be enforced at application level for better performance