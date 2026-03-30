-- Simple approach: Remove duplicates first, then normalize

-- Step 1: Drop all phone constraints
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS unique_phone;
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS uq_candidates_phone;
DROP INDEX IF EXISTS idx_candidates_phone_unique;

-- Step 2: Create normalize function
CREATE OR REPLACE FUNCTION normalize_phone(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
    IF phone_input IS NULL OR phone_input = '' THEN
        RETURN phone_input;
    END IF;
    
    -- Remove all spaces, dashes, parentheses
    phone_input := REGEXP_REPLACE(phone_input, '[^0-9+]', '', 'g');
    
    -- Handle different Kenyan formats
    IF phone_input ~ '^(\+254|254)' THEN
        -- Already has country code, just clean it
        phone_input := REGEXP_REPLACE(phone_input, '^\+?254', '+254');
    ELSIF phone_input ~ '^0[17]' THEN
        -- Starts with 0, replace with +254
        phone_input := '+254' || SUBSTRING(phone_input FROM 2);
    ELSIF phone_input ~ '^[17]' AND LENGTH(phone_input) = 9 THEN
        -- Missing 0 and country code
        phone_input := '+254' || phone_input;
    END IF;
    
    RETURN phone_input;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Delete exact phone duplicates first (keep oldest)
WITH exact_duplicates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at ASC) as rn
    FROM candidates 
    WHERE phone IS NOT NULL AND phone != ''
)
DELETE FROM candidates 
WHERE id IN (SELECT id FROM exact_duplicates WHERE rn > 1);

-- Step 4: Create temp table with normalized phones
CREATE TEMP TABLE normalized_candidates AS
SELECT 
    id,
    normalize_phone(phone) as normalized_phone,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY normalize_phone(phone) ORDER BY created_at ASC) as rn
FROM candidates 
WHERE phone IS NOT NULL AND phone != '';

-- Step 5: Delete normalized duplicates (keep oldest)
DELETE FROM candidates 
WHERE id IN (
    SELECT id FROM normalized_candidates WHERE rn > 1
);

-- Step 6: Update all phones to normalized format
UPDATE candidates 
SET phone = normalize_phone(phone)
WHERE phone IS NOT NULL AND phone != '';

-- Step 7: Skip adding constraint (it already exists)

-- Step 8: Create trigger for future normalization
CREATE OR REPLACE FUNCTION normalize_phone_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
        NEW.phone := normalize_phone(NEW.phone);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_normalize_phone ON candidates;
CREATE TRIGGER trigger_normalize_phone
    BEFORE INSERT OR UPDATE ON candidates
    FOR EACH ROW
    EXECUTE FUNCTION normalize_phone_trigger();