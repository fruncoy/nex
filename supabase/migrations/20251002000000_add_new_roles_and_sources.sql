-- Add new roles and sources to candidates and clients tables

-- Update candidates table constraints to include new roles and sources
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_role_check;
ALTER TABLE candidates ADD CONSTRAINT candidates_role_check 
CHECK (role IN ('Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver', 'Housekeeper'));

ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_source_check;
ALTER TABLE candidates ADD CONSTRAINT candidates_source_check 
CHECK (source IN ('TikTok', 'Facebook', 'Instagram', 'Google Search', 'Website', 'Referral', 'LinkedIn', 'Walk-in poster', 'Youtube'));

-- Update clients table constraints to include new roles and sources
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_want_to_hire_check;
ALTER TABLE clients ADD CONSTRAINT clients_want_to_hire_check 
CHECK (want_to_hire IN ('Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver', 'Housekeeper', 'Uniforms'));

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_source_check;
ALTER TABLE clients ADD CONSTRAINT clients_source_check 
CHECK (source IN ('TikTok', 'Facebook', 'Instagram', 'Google Search', 'Website', 'Referral', 'LinkedIn', 'Walk-in poster', 'Youtube'));