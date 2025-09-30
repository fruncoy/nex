/*
  # Sample Data for Nestalk Application

  1. Sample Data
    - 10 candidates with various statuses
    - 5 interviews (3 attended: 2 passed, 1 failed; 2 not attended)
    - 5 clients with different stages
    - 3 training leads for cooking, first aid, housekeeping

  2. Data Distribution
    - Candidates: 3 interviewed (2 passed, 1 failed), 3 haven't met/scheduled, 1 not called, 1 didn't pick up, 2 others
    - Clients: Some sent candidate profiles, some yet to be called
    - Training: Cooking, First Aid, Housekeeping
*/

-- Insert sample candidates
INSERT INTO candidates (name, phone, source, inquiry_date, status, reminder_date, notes, interview_outcome) VALUES
  -- 3 interviewed candidates
  ('Alice Johnson', '555-1001', 'TikTok', '2025-01-15', 'interviewed', NULL, 'Strong technical background, excellent communication skills', 'Passed'),
  ('Bob Williams', '555-1002', 'Meta', '2025-01-18', 'interviewed', NULL, 'Good experience but lacks specific skills we need', 'Passed'),
  ('Charlie Brown', '555-1003', 'WhatsApp', '2025-01-20', 'interviewed', NULL, 'Average performance, not suitable for current role', 'Failed'),
  
  -- 3 haven't met/scheduled
  ('Diana Prince', '555-1004', 'Referrals', '2025-01-22', 'scheduled', '2025-02-05', 'Interview scheduled for next week', NULL),
  ('Edward Smith', '555-1005', 'Website', '2025-01-25', 'scheduled', '2025-02-06', 'Phone screening completed, in-person interview pending', NULL),
  ('Fiona Davis', '555-1006', 'TikTok', '2025-01-28', 'scheduled', '2025-02-07', 'Very interested in the position, interview confirmed', NULL),
  
  -- 1 not called yet
  ('George Wilson', '555-1007', 'Meta', '2025-01-30', 'new', '2025-02-03', 'New application received, need to make first contact', NULL),
  
  -- 1 didn't pick up
  ('Helen Garcia', '555-1008', 'WhatsApp', '2025-02-01', 'contacted', '2025-02-04', 'Called multiple times, no answer. Left voicemail', NULL),
  
  -- 2 others in various stages
  ('Ivan Martinez', '555-1009', 'Referrals', '2025-02-02', 'contacted', '2025-02-05', 'Initial contact made, waiting for callback', NULL),
  ('Julia Anderson', '555-1010', 'Website', '2025-02-03', 'follow-up', '2025-02-06', 'Second follow-up call scheduled', NULL);

-- Insert sample clients
INSERT INTO clients (name_company, contact_info, role_requested, inquiry_date, status, reminder_date, notes) VALUES
  -- Clients with candidate profiles sent
  ('TechCorp Solutions', 'hr@techcorp.com / 555-2001', 'Software Developer', '2025-01-10', 'proposals-sent', '2025-02-05', 'Sent 3 candidate profiles, waiting for client feedback'),
  ('Global Industries', 'jane.smith@global.com / 555-2002', 'Project Manager', '2025-01-15', 'proposals-sent', '2025-02-06', 'Shared 2 PM candidates, client reviewing resumes'),
  
  -- Clients yet to be called or get back
  ('StartupXYZ', 'founder@startupxyz.com / 555-2003', 'Full Stack Developer', '2025-01-20', 'requirements-gathered', '2025-02-04', 'Requirements gathered, need to find suitable candidates'),
  ('MegaCorp Ltd', 'recruiter@megacorp.com / 555-2004', 'Data Analyst', '2025-01-25', 'contacted', '2025-02-07', 'Initial call completed, waiting for their callback'),
  ('Innovation Hub', 'contact@innovation.com / 555-2005', 'UI/UX Designer', '2025-02-01', 'new', '2025-02-08', 'New inquiry received, need to make first contact call');

-- Insert sample training leads
INSERT INTO training_leads (name, phone, training_type, inquiry_date, status, reminder_date, notes) VALUES
  ('Maria Rodriguez', '555-3001', 'Cooking', '2025-01-12', 'interested', '2025-02-05', 'Very interested in professional cooking course, sent detailed brochure'),
  ('David Kim', '555-3002', 'First Aid', '2025-01-18', 'enrolled', NULL, 'Successfully enrolled in first aid certification program, starts Monday'),
  ('Lisa Thompson', '555-3003', 'Housekeeping', '2025-01-25', 'contacted', '2025-02-06', 'Called about housekeeping training program, will decide by end of week');

-- Insert sample interviews (need to get candidate IDs first)
DO $$
DECLARE
    alice_id uuid;
    bob_id uuid;
    charlie_id uuid;
    diana_id uuid;
    edward_id uuid;
BEGIN
    -- Get candidate IDs for interviews
    SELECT id INTO alice_id FROM candidates WHERE name = 'Alice Johnson';
    SELECT id INTO bob_id FROM candidates WHERE name = 'Bob Williams';
    SELECT id INTO charlie_id FROM candidates WHERE name = 'Charlie Brown';
    SELECT id INTO diana_id FROM candidates WHERE name = 'Diana Prince';
    SELECT id INTO edward_id FROM candidates WHERE name = 'Edward Smith';

    -- Insert interviews: 3 attended (2 passed, 1 failed), 2 scheduled but not attended yet
    INSERT INTO interviews (candidate_id, date_time, location, attended, outcome, notes) VALUES
      -- 3 attended interviews
      (alice_id, '2025-01-28 10:00:00+00', 'Office Conference Room A', true, 'Excellent', 'Outstanding technical skills and great cultural fit'),
      (bob_id, '2025-01-29 14:30:00+00', 'Zoom Meeting', true, 'Good', 'Solid candidate with good potential'),
      (charlie_id, '2025-01-30 09:00:00+00', 'Office Conference Room B', true, 'Poor', 'Not suitable for the role requirements'),
      
      -- 2 scheduled but not attended yet
      (diana_id, '2025-02-05 11:00:00+00', 'Phone Interview', false, NULL, 'Upcoming phone interview scheduled'),
      (edward_id, '2025-02-06 15:00:00+00', 'Office Conference Room A', false, NULL, 'In-person interview scheduled for next week');
END $$;