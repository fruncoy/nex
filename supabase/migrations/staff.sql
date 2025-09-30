/*
  # Create Staff Table

  1. New Tables
    - `staff`
      - `id` (uuid, primary key, references auth.users)
      - `name` (text)
      - `username` (text, 4 characters max for stamps)
      - `email` (text, unique)
      - `role` (text, default 'admin')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on staff table
    - Add policies for staff management
*/

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  username text NOT NULL CHECK (length(username) <= 4),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Create policies for staff
CREATE POLICY "Staff can view all staff"
  ON staff FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert staff"
  ON staff FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update staff"
  ON staff FOR UPDATE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS staff_email_idx ON staff(email);
CREATE INDEX IF NOT EXISTS staff_username_idx ON staff(username);