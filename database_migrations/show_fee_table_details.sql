-- Check all columns in niche_fees
\d niche_fees;

-- Check all columns in niche_payments  
\d niche_payments;

-- If the above doesn't work, try this alternative:
SELECT 
    table_name,
    column_name, 
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('niche_fees', 'niche_payments')
ORDER BY table_name, ordinal_position;

-- Show actual data from niche_fees
SELECT * FROM niche_fees ORDER BY id LIMIT 10;

-- Show actual data from niche_payments
SELECT * FROM niche_payments ORDER BY id LIMIT 10;