-- Test the blacklist trigger
-- Step 1: Update a test staff member to Blacklisted
UPDATE newstaff_members
SET employment_status = 'Blacklisted'
WHERE id = 'cda5b4c5-39b1-4a6f-922f-f00008aff004';

-- Step 2: Check if it updated niche_candidates
SELECT name, phone, status
FROM niche_candidates
WHERE normalize_phone_niche(phone) = normalize_phone_niche('+254793005722');

-- Step 3: Check if it updated niche_training
SELECT name, phone, status
FROM niche_training
WHERE normalize_phone_niche(phone) = normalize_phone_niche('+254793005722');

-- Step 4: Revert the test back
UPDATE newstaff_members
SET employment_status = 'Yet to be Employed'
WHERE id = 'cda5b4c5-39b1-4a6f-922f-f00008aff004';
