-- Check columns in both fee tables
SELECT 
    table_name,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('niche_fees', 'niche_payments')
ORDER BY table_name, ordinal_position;

-- Show sample data from niche_fees
SELECT * FROM niche_fees LIMIT 5;

-- Show sample data from niche_payments  
SELECT * FROM niche_payments LIMIT 5;