-- Disable only user-created triggers, not system triggers

-- Step 1: Create the normalize function
CREATE OR REPLACE FUNCTION normalize_phone_niche(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
    IF phone_input IS NULL OR phone_input = '' THEN
        RETURN phone_input;
    END IF;
    
    phone_input := REGEXP_REPLACE(phone_input, '[^0-9+]', '', 'g');
    
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

-- Step 2: List all user triggers (not system triggers)
SELECT 
    tgname as trigger_name,
    pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'niche_training'::regclass
AND tgisinternal = false  -- Only user triggers
ORDER BY tgname;

-- Step 3: Disable user triggers one by one
-- First, let's see which ones exist
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'niche_training'::regclass
        AND tgisinternal = false
        AND tgname NOT LIKE 'RI_%'  -- Skip referential integrity triggers
    LOOP
        EXECUTE format('ALTER TABLE niche_training DISABLE TRIGGER %I', trigger_record.tgname);
        RAISE NOTICE 'Disabled trigger: %', trigger_record.tgname;
    END LOOP;
END $$;

-- Step 4: Reload PostgREST
NOTIFY pgrst, 'reload schema';

-- Step 5: Test
SELECT 'Triggers disabled - ready to test' as status;
