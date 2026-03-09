-- Update status constraint to replace Suspended with Graduated
ALTER TABLE niche_training DROP CONSTRAINT IF EXISTS niche_training_status_check;
ALTER TABLE niche_training ADD CONSTRAINT niche_training_status_check 
  CHECK (status IN ('Pending', 'Active', 'Graduated', 'Expelled'));

-- Update any existing Suspended records to Expelled
UPDATE niche_training SET status = 'Expelled' WHERE status = 'Suspended';