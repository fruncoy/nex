-- Check actual table structure and relationships
-- First, let's see what tables exist in the niche system

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%niche%'
ORDER BY table_name;

-- Check niche_training table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'niche_training'
ORDER BY ordinal_position;

-- Check niche_fees table structure  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'niche_fees'
ORDER BY ordinal_position;

-- Check niche_payments table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'niche_payments'
ORDER BY ordinal_position;

-- Sample data from niche_training to understand the structure
SELECT * FROM niche_training LIMIT 5;

-- Sample data from niche_fees to understand the structure
SELECT * FROM niche_fees LIMIT 5;