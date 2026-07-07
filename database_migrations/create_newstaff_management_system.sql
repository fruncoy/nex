-- Create Staff Management System Tables
-- Migration: Create newstaff tables for managing graduated trainees and staff

-- New Staff Members table
CREATE TABLE IF NOT EXISTS newstaff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  role text,
  -- Link to NICHE training (nullable for manual additions)
  niche_training_id uuid REFERENCES niche_training(id) ON DELETE SET NULL,
  -- Employment information
  employment_status text DEFAULT 'Unemployed',
  salary numeric,
  availability text,
  -- Signed CoC
  signed_coc boolean DEFAULT false,
  -- Metadata
  is_graduate boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by text,
  updated_by text,
  UNIQUE(niche_training_id)
);

-- New Staff Meetings table
CREATE TABLE IF NOT EXISTS newstaff_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  meeting_type text NOT NULL CHECK (meeting_type IN (
    'General Meeting',
    'Online Webinar',
    'Training Session',
    'Welfare Meeting'
  )),
  date_time timestamptz NOT NULL,
  location text,
  notes text,
  is_finalized boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by text
);

-- New Staff Meeting Attendance table
CREATE TABLE IF NOT EXISTS newstaff_meeting_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES newstaff_meetings(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES newstaff_members(id) ON DELETE CASCADE,
  present boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(meeting_id, staff_id)
);

-- New Staff Contributions table
CREATE TABLE IF NOT EXISTS newstaff_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES newstaff_members(id) ON DELETE CASCADE,
  contribution_type text NOT NULL CHECK (contribution_type IN (
    'Volunteer Work',
    'Leadership',
    'Referral'
  )),
  description text NOT NULL,
  points integer DEFAULT 1,
  referral_staff_id uuid REFERENCES newstaff_members(id) ON DELETE SET NULL,
  date_of_contribution date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  created_by text
);

-- New Staff Welfare Members table (placeholder)
CREATE TABLE IF NOT EXISTS newstaff_welfare_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES newstaff_members(id) ON DELETE CASCADE,
  join_date date DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by text,
  UNIQUE(staff_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_newstaff_members_phone ON newstaff_members(phone);
CREATE INDEX IF NOT EXISTS idx_newstaff_members_employment_status ON newstaff_members(employment_status);
CREATE INDEX IF NOT EXISTS idx_newstaff_members_is_graduate ON newstaff_members(is_graduate);
CREATE INDEX IF NOT EXISTS idx_newstaff_meetings_date_time ON newstaff_meetings(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_newstaff_meetings_type ON newstaff_meetings(meeting_type);
CREATE INDEX IF NOT EXISTS idx_newstaff_meeting_attendance_meeting_id ON newstaff_meeting_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_newstaff_meeting_attendance_staff_id ON newstaff_meeting_attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_newstaff_contributions_staff_id ON newstaff_contributions(staff_id);
CREATE INDEX IF NOT EXISTS idx_newstaff_contributions_type ON newstaff_contributions(contribution_type);
CREATE INDEX IF NOT EXISTS idx_newstaff_welfare_members_staff_id ON newstaff_welfare_members(staff_id);

-- Enable Row Level Security
ALTER TABLE newstaff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE newstaff_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE newstaff_meeting_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE newstaff_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE newstaff_welfare_members ENABLE ROW LEVEL SECURITY;

-- Create policies for newstaff_members
CREATE POLICY "Users can view all newstaff members"
  ON newstaff_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert newstaff members"
  ON newstaff_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update newstaff members"
  ON newstaff_members FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete newstaff members"
  ON newstaff_members FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for newstaff_meetings
CREATE POLICY "Users can view all newstaff meetings"
  ON newstaff_meetings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert newstaff meetings"
  ON newstaff_meetings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update newstaff meetings"
  ON newstaff_meetings FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete newstaff meetings"
  ON newstaff_meetings FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for newstaff_meeting_attendance
CREATE POLICY "Users can view all newstaff meeting attendance"
  ON newstaff_meeting_attendance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert newstaff meeting attendance"
  ON newstaff_meeting_attendance FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update newstaff meeting attendance"
  ON newstaff_meeting_attendance FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete newstaff meeting attendance"
  ON newstaff_meeting_attendance FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for newstaff_contributions
CREATE POLICY "Users can view all newstaff contributions"
  ON newstaff_contributions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert newstaff contributions"
  ON newstaff_contributions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update newstaff contributions"
  ON newstaff_contributions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete newstaff contributions"
  ON newstaff_contributions FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for newstaff_welfare_members
CREATE POLICY "Users can view all newstaff welfare members"
  ON newstaff_welfare_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert newstaff welfare members"
  ON newstaff_welfare_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update newstaff welfare members"
  ON newstaff_welfare_members FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete newstaff welfare members"
  ON newstaff_welfare_members FOR DELETE
  TO authenticated
  USING (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for newstaff_members
CREATE TRIGGER update_newstaff_members_updated_at
  BEFORE UPDATE ON newstaff_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to sync graduates from niche_training to newstaff_members
CREATE OR REPLACE FUNCTION sync_graduates_to_staff()
RETURNS json AS $$
DECLARE
  v_imported integer := 0;
  v_skipped integer := 0;
  v_updated integer := 0;
BEGIN
  -- Insert new graduates not already in staff
  INSERT INTO newstaff_members (
    name,
    phone,
    role,
    niche_training_id,
    signed_coc,
    created_by,
    updated_by
  )
  SELECT 
    nt.name,
    nt.phone,
    nt.role,
    nt.id,
    false,
    'System',
    'System'
  FROM niche_training nt
  WHERE nt.status IN ('Graduated', 'Completed')
    AND NOT EXISTS (
      SELECT 1 FROM newstaff_members sm 
      WHERE sm.niche_training_id = nt.id
    );
  
  GET DIAGNOSTICS v_imported = ROW_COUNT;
  
  -- Update existing staff if info changed in niche_training
  UPDATE newstaff_members sm
  SET 
    name = nt.name,
    phone = nt.phone,
    role = nt.role,
    updated_at = now(),
    updated_by = 'System'
  FROM niche_training nt
  WHERE sm.niche_training_id = nt.id
    AND (sm.name != nt.name OR sm.phone != nt.phone OR sm.role != nt.role);
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  -- Count how many were already there
  SELECT COUNT(*) INTO v_skipped
  FROM newstaff_members sm
  JOIN niche_training nt ON sm.niche_training_id = nt.id
  WHERE nt.status IN ('Graduated', 'Completed');
  
  RETURN json_build_object(
    'imported', v_imported,
    'updated', v_updated,
    'total', v_imported + v_updated + v_skipped
  );
END;
$$ LANGUAGE plpgsql;
