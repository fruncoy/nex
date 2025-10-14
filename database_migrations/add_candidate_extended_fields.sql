-- Add extended fields to candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS added_by TEXT DEFAULT 'admin';
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS live_arrangement TEXT CHECK (live_arrangement IN ('Live-In', 'Live-Out'));
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS work_schedule TEXT CHECK (work_schedule IN ('Full Time', 'Part Time'));
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS employment_type TEXT CHECK (employment_type IN ('Permanent', 'Temporary'));
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS expected_salary DECIMAL(10,2);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS place_of_birth TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS next_of_kin_1_name TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS next_of_kin_1_phone TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS next_of_kin_1_location TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS next_of_kin_2_name TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS next_of_kin_2_phone TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS next_of_kin_2_location TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS referee_1_name TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS referee_1_phone TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS referee_2_name TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS referee_2_phone TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS apartment TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS total_years_experience INTEGER;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS has_good_conduct_cert BOOLEAN DEFAULT false;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS good_conduct_cert_receipt TEXT;

-- Update existing candidates to have added_by as 'admin' if null
UPDATE candidates SET added_by = 'admin' WHERE added_by IS NULL;