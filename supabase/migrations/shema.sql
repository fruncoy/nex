/*
  # Initial Schema for Nestalk Application

  1. New Tables
    - `candidates`
      - `id` (uuid, primary key)
      - `name` (text)
      - `phone` (text)
      - `source` (text) - inquiry source (TikTok, Meta, WhatsApp, Referrals)
      - `inquiry_date` (date)
      - `status` (text) - status tags
      - `reminder_date` (date, optional)
      - `assigned_to` (uuid, references auth.users)
      - `notes` (text)
      - `interview_outcome` (text, optional)
      - `created_at` (timestamp)
      
    - `clients`
      - `id` (uuid, primary key)
      - `name_company` (text)
      - `contact_info` (text)
      - `role_requested` (text)
      - `inquiry_date` (date)
      - `status` (text)
      - `reminder_date` (date, optional)
      - `assigned_to` (uuid, references auth.users)
      - `notes` (text)
      - `created_at` (timestamp)
      
    - `training_leads`
      - `id` (uuid, primary key)
      - `name` (text)
      - `phone` (text)
      - `training_type` (text)
      - `inquiry_date` (date)
      - `status` (text)
      - `reminder_date` (date, optional)
      - `assigned_to` (uuid, references auth.users)
      - `notes` (text)
      - `created_at` (timestamp)
      
    - `interviews`
      - `id` (uuid, primary key)
      - `candidate_id` (uuid, references candidates)
      - `date_time` (timestamp)
      - `location` (text)
      - `assigned_staff` (uuid, references auth.users)
      - `attended` (boolean, default false)
      - `outcome` (text, optional)
      - `notes` (text)
      - `created_at` (timestamp)
      
    - `updates`
      - `id` (uuid, primary key)
      - `linked_to_type` (text) - 'candidate', 'client', 'training_lead', 'interview'
      - `linked_to_id` (uuid)
      - `user_id` (uuid, references auth.users)
      - `update_text` (text)
      - `reminder_date` (date, optional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
*/

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  source text NOT NULL,
  inquiry_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'new',
  reminder_date date,
  assigned_to uuid REFERENCES auth.users(id),
  notes text DEFAULT '',
  interview_outcome text,
  created_at timestamptz DEFAULT now()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_company text NOT NULL,
  contact_info text NOT NULL,
  role_requested text NOT NULL,
  inquiry_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'new',
  reminder_date date,
  assigned_to uuid REFERENCES auth.users(id),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create training_leads table
CREATE TABLE IF NOT EXISTS training_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  training_type text NOT NULL,
  inquiry_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'new',
  reminder_date date,
  assigned_to uuid REFERENCES auth.users(id),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create interviews table
CREATE TABLE IF NOT EXISTS interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE,
  date_time timestamptz NOT NULL,
  location text NOT NULL,
  assigned_staff uuid REFERENCES auth.users(id),
  attended boolean DEFAULT false,
  outcome text,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create updates table
CREATE TABLE IF NOT EXISTS updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linked_to_type text NOT NULL CHECK (linked_to_type IN ('candidate', 'client', 'training_lead', 'interview')),
  linked_to_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  update_text text NOT NULL,
  reminder_date date,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;

-- Create policies for candidates
CREATE POLICY "Users can view all candidates"
  ON candidates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert candidates"
  ON candidates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update candidates"
  ON candidates FOR UPDATE
  TO authenticated
  USING (true);

-- Create policies for clients
CREATE POLICY "Users can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (true);

-- Create policies for training_leads
CREATE POLICY "Users can view all training leads"
  ON training_leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert training leads"
  ON training_leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update training leads"
  ON training_leads FOR UPDATE
  TO authenticated
  USING (true);

-- Create policies for interviews
CREATE POLICY "Users can view all interviews"
  ON interviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert interviews"
  ON interviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update interviews"
  ON interviews FOR UPDATE
  TO authenticated
  USING (true);

-- Create policies for updates
CREATE POLICY "Users can view all updates"
  ON updates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own updates"
  ON updates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS candidates_source_idx ON candidates(source);
CREATE INDEX IF NOT EXISTS candidates_status_idx ON candidates(status);
CREATE INDEX IF NOT EXISTS candidates_reminder_date_idx ON candidates(reminder_date);
CREATE INDEX IF NOT EXISTS clients_status_idx ON clients(status);
CREATE INDEX IF NOT EXISTS clients_reminder_date_idx ON clients(reminder_date);
CREATE INDEX IF NOT EXISTS training_leads_status_idx ON training_leads(status);
CREATE INDEX IF NOT EXISTS interviews_date_time_idx ON interviews(date_time);
CREATE INDEX IF NOT EXISTS updates_linked_to_idx ON updates(linked_to_type, linked_to_id);
CREATE INDEX IF NOT EXISTS updates_created_at_idx ON updates(created_at DESC);