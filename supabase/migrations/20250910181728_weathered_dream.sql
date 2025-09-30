/*
  # KPI Reporting System

  1. New Tables
    - `kpi_targets`
      - `id` (uuid, primary key)
      - `role` (text)
      - `kpi_name` (text)
      - `target_value` (numeric)
      - `unit` (text) - %, KES, days, count
      - `is_inverse` (boolean) - true if lower is better
      - `requires_event_date` (boolean) - true if KPI needs specific date
      - `created_at` (timestamp)
      
    - `kpi_records`
      - `id` (uuid, primary key)
      - `role` (text)
      - `kpi_name` (text)
      - `actual_value` (numeric)
      - `comments` (text, optional)
      - `variance` (numeric, auto-calculated)
      - `rag_status` (text) - Green, Amber, Red
      - `recorded_at` (timestamp, auto in EAT)
      - `actual_event_date` (date, nullable)
      - `created_by` (uuid, references staff)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - All authenticated users can view and insert
*/

-- Create kpi_targets table
CREATE TABLE IF NOT EXISTS kpi_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  kpi_name text NOT NULL,
  target_value numeric NOT NULL,
  unit text NOT NULL,
  is_inverse boolean DEFAULT false,
  requires_event_date boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role, kpi_name)
);

-- Create kpi_records table
CREATE TABLE IF NOT EXISTS kpi_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  kpi_name text NOT NULL,
  actual_value numeric NOT NULL,
  comments text,
  variance numeric NOT NULL,
  rag_status text NOT NULL CHECK (rag_status IN ('Green', 'Amber', 'Red')),
  recorded_at timestamptz DEFAULT (now() AT TIME ZONE 'Africa/Nairobi'),
  actual_event_date date,
  created_by uuid REFERENCES staff(id),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_records ENABLE ROW LEVEL SECURITY;

-- Create policies for kpi_targets
CREATE POLICY "All users can view KPI targets"
  ON kpi_targets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All users can insert KPI targets"
  ON kpi_targets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All users can update KPI targets"
  ON kpi_targets FOR UPDATE
  TO authenticated
  USING (true);

-- Create policies for kpi_records
CREATE POLICY "All users can view KPI records"
  ON kpi_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All users can insert KPI records"
  ON kpi_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All users can update KPI records"
  ON kpi_records FOR UPDATE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS kpi_targets_role_idx ON kpi_targets(role);
CREATE INDEX IF NOT EXISTS kpi_targets_kpi_name_idx ON kpi_targets(kpi_name);
CREATE INDEX IF NOT EXISTS kpi_records_role_idx ON kpi_records(role);
CREATE INDEX IF NOT EXISTS kpi_records_kpi_name_idx ON kpi_records(kpi_name);
CREATE INDEX IF NOT EXISTS kpi_records_recorded_at_idx ON kpi_records(recorded_at DESC);
CREATE INDEX IF NOT EXISTS kpi_records_rag_status_idx ON kpi_records(rag_status);
CREATE INDEX IF NOT EXISTS kpi_records_actual_event_date_idx ON kpi_records(actual_event_date);

-- Insert sample KPI targets
INSERT INTO kpi_targets (role, kpi_name, target_value, unit, is_inverse, requires_event_date) VALUES
  -- Marketing Specialist KPIs
  ('Marketing Specialist', 'Lead Generation', 50, 'count', false, false),
  ('Marketing Specialist', 'Cost per Lead', 500, 'KES', true, false),
  ('Marketing Specialist', 'Conversion Rate', 15, '%', false, false),
  ('Marketing Specialist', 'Social Media Engagement', 1000, 'count', false, false),
  ('Marketing Specialist', 'Campaign Response Time', 2, 'hours', true, false),
  
  -- Recruitment Specialist KPIs
  ('Recruitment Specialist', 'Candidates Sourced', 30, 'count', false, false),
  ('Recruitment Specialist', 'Interview Completion Rate', 80, '%', false, false),
  ('Recruitment Specialist', 'Time to Fill Position', 14, 'days', true, false),
  ('Recruitment Specialist', 'Candidate Quality Score', 85, '%', false, false),
  ('Recruitment Specialist', 'Placement Success Rate', 70, '%', false, false),
  ('Recruitment Specialist', 'Placement Date', 1, 'count', false, true),
  
  -- Sales Specialist KPIs
  ('Sales Specialist', 'Revenue Generated', 100000, 'KES', false, false),
  ('Sales Specialist', 'Client Acquisition', 5, 'count', false, false),
  ('Sales Specialist', 'Deal Closure Rate', 60, '%', false, false),
  ('Sales Specialist', 'Average Deal Size', 20000, 'KES', false, false),
  ('Sales Specialist', 'Client Retention Rate', 90, '%', false, false),
  
  -- Training Coordinator KPIs
  ('Training Coordinator', 'Training Sessions Delivered', 8, 'count', false, false),
  ('Training Coordinator', 'Trainee Completion Rate', 85, '%', false, false),
  ('Training Coordinator', 'Training Satisfaction Score', 4.5, 'rating', false, false),
  ('Training Coordinator', 'Certification Pass Rate', 80, '%', false, false),
  ('Training Coordinator', 'Training Material Updates', 3, 'count', false, false);