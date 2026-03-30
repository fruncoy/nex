-- Update existing interview outcomes to new format
UPDATE interviews 
SET outcome = 'Won Interview' 
WHERE outcome = 'Won';

UPDATE interviews 
SET outcome = 'Lost Interview' 
WHERE outcome = 'Lost';