-- Fix the trigger issue - either create function or drop triggers

-- Step 1: Check what triggers exist on niche_training
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'niche_training'
ORDER BY trigger_name;

-- Step 2: Create the normalize_phone_niche function
CREATE OR REPLACE FUNCTION normalize_phone_niche(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
    IF phone_input IS NULL OR phone_input = '' THEN
        RETURN phone_input;
    END IF;
    
    -- Remove all non-digits except +
    phone_input := REGEXP_REPLACE(phone_input, '[^0-9+]', '', 'g');
    
    -- Handle Kenyan formats
    IF phone_input ~ '^(\+254|254)' THEN
        phone_input := REGEXP_REPLACE(phone_input, '^\+?254', '+254');
    ELSIF phone_input ~ '^0[17]' THEN
        phone_input := '+254' || SUBSTRING(phone_input FROM 2);
    ELSIF phone_input ~ '^[17]' AND LENGTH(phone_input) = 9 THEN
        phone_input := '+254' || phone_input;
    END IF;
    
    RETURN phone_input;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Test the function
SELECT normalize_phone_niche('0712345678') as should_be_plus254;

-- Step 4: If there are duplicate-prevention triggers causing issues, we can recreate them
-- First, check if the prevent_niche_training_duplicates trigger function exists
SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'prevent_niche_training_duplicates'
) as trigger_function_exists;

-- Step 5: Reload PostgREST
NOTIFY pgrst, 'reload schema';

-- Step 6: Wait and try a test insert
DO $$
BEGIN
    INSERT INTO niche_training (name, status, created_by, updated_by)
    VALUES ('SQL Test', 'Active', 'Test', 'Test');
    RAISE NOTICE 'INSERT worked!';
    -- Don't rollback, let it succeed
END $$;

-- Step 7: Clean up test record
DELETE FROM niche_training WHERE name = 'SQL Test' AND created_by = 'Test';
