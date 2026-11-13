-- Check structure of niche_fees table
SELECT 'niche_fees' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'niche_fees'
ORDER BY ordinal_position;

-- Check structure of niche_payments table  
SELECT 'niche_payments' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'niche_payments'
ORDER BY ordinal_position;

-- Show sample data from niche_fees
SELECT 'niche_fees sample:' as info;
SELECT * FROM niche_fees LIMIT 5;

-- Show sample data from niche_payments
SELECT 'niche_payments sample:' as info;
SELECT * FROM niche_payments LIMIT 5;

-- Count records in each table
SELECT 'niche_fees' as table_name, COUNT(*) as record_count FROM niche_fees
UNION ALL
SELECT 'niche_payments' as table_name, COUNT(*) as record_count FROM niche_payments;