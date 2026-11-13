-- Comprehensive check and fix for all trigger issues

-- 1. List all triggers on niche_training
SELECT 
    tgname as trigger_name,
    tgtype,
    tgenabled as enabled,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'niche_training'::regclass
AND tgisinternal = false;

-- 2. Check if normalize_phone_niche function exists
SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'normalize_phone_niche'
) as normalize_function_exists;

-- 3. If function doesn't exist, create it
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

-- 4. TEMPORARY: Disable all triggers that might be causing issues
-- We'll re-enable them after testing
ALTER TABLE niche_training DISABLE TRIGGER ALL;

-- 5. Reload PostgREST
NOTIFY pgrst, 'reload schema';

-- 6. Test if INSERT works now (with triggers disabled)
-- Run this manually to test:
-- INSERT INTO niche_training (name, status, created_by, updated_by) 
-- VALUES ('Test With Triggers Disabled', 'Active', 'Test', 'Test');

-- 7. If that works, we know the issue is with triggers
-- Then we can selectively re-enable them:
-- ALTER TABLE niche_training ENABLE TRIGGER ALL;
