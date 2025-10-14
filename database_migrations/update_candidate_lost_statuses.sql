-- Update existing LOST candidates to "Lost, No Good Conduct"
UPDATE candidates 
SET status = 'Lost, No Good Conduct' 
WHERE status = 'LOST';

-- Update any interviews with LOST outcome to new format
UPDATE interviews 
SET outcome = 'Lost, No Good Conduct' 
WHERE outcome = 'Lost';