-- Fix source constraint to include all valid source options
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_source_check;

ALTER TABLE candidates ADD CONSTRAINT candidates_source_check 
CHECK (source IN (
  'TikTok', 
  'Facebook', 
  'Instagram', 
  'Google Search', 
  'Website', 
  'Referral', 
  'LinkedIn', 
  'Walk-in poster', 
  'Youtube', 
  'Referred By Church'
));