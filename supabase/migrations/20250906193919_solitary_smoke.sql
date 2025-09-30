/*
  # Meeting Notes and Deliverables System

  1. New Tables
    - `meeting_notes`
      - `id` (uuid, primary key)
      - `title` (text)
      - `meeting_date` (date)
      - `notes` (text)
      - `created_by` (uuid, references staff)
      - `created_at` (timestamp)
      
    - `deliverables`
      - `id` (uuid, primary key)
      - `meeting_note_id` (uuid, references meeting_notes)
      - `task_description` (text)
      - `assigned_to` (uuid, references staff)
      - `status` (text) - 'pending', 'done'
      - `due_date` (date, optional)
      - `completed_at` (timestamp, optional)
      - `completed_by` (uuid, references staff, optional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create meeting_notes table
CREATE TABLE IF NOT EXISTS meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  meeting_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text NOT NULL,
  created_by uuid REFERENCES staff(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create deliverables table
CREATE TABLE IF NOT EXISTS deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_note_id uuid REFERENCES meeting_notes(id) ON DELETE CASCADE NOT NULL,
  task_description text NOT NULL,
  assigned_to uuid REFERENCES staff(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  due_date date,
  completed_at timestamptz,
  completed_by uuid REFERENCES staff(id),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;

-- Create policies for meeting_notes
CREATE POLICY "Staff can view all meeting notes"
  ON meeting_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert meeting notes"
  ON meeting_notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update meeting notes"
  ON meeting_notes FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Staff can delete meeting notes"
  ON meeting_notes FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for deliverables
CREATE POLICY "Staff can view all deliverables"
  ON deliverables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert deliverables"
  ON deliverables FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update deliverables"
  ON deliverables FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Staff can delete deliverables"
  ON deliverables FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS meeting_notes_date_idx ON meeting_notes(meeting_date DESC);
CREATE INDEX IF NOT EXISTS meeting_notes_created_by_idx ON meeting_notes(created_by);
CREATE INDEX IF NOT EXISTS deliverables_meeting_note_id_idx ON deliverables(meeting_note_id);
CREATE INDEX IF NOT EXISTS deliverables_assigned_to_idx ON deliverables(assigned_to);
CREATE INDEX IF NOT EXISTS deliverables_status_idx ON deliverables(status);
CREATE INDEX IF NOT EXISTS deliverables_due_date_idx ON deliverables(due_date);