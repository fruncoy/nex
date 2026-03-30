-- Remove unused/duplicate fields from candidates table
ALTER TABLE candidates DROP COLUMN IF EXISTS certifications;
ALTER TABLE candidates DROP COLUMN IF EXISTS languages;
ALTER TABLE candidates DROP COLUMN IF EXISTS place_of_stay;
ALTER TABLE candidates DROP COLUMN IF EXISTS current_address;
ALTER TABLE candidates DROP COLUMN IF EXISTS apartment_details;
ALTER TABLE candidates DROP COLUMN IF EXISTS years_experience;
ALTER TABLE candidates DROP COLUMN IF EXISTS good_conduct_cert_details;
ALTER TABLE candidates DROP COLUMN IF EXISTS kenya_experience_months;
ALTER TABLE candidates DROP COLUMN IF EXISTS kenya_experience_years;
ALTER TABLE candidates DROP COLUMN IF EXISTS internal_score;