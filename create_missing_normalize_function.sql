-- Create the missing normalize_phone_niche function and triggers

-- Step 1: Create the normalize phone function
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

-- Step 2: Test the function
SELECT normalize_phone_niche('0712345678') as test1;
SELECT normalize_phone_niche('+254712345678') as test2;
SELECT normalize_phone_niche('712345678') as test3;

-- Step 3: Reload PostgREST
NOTIFY pgrst, 'reload schema';
