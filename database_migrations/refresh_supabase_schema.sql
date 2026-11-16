-- After adding columns, Supabase's PostgREST needs to reload its schema cache
-- This is why SELECT works but INSERT doesn't - the API cache is stale

-- Method 1: Reload schema cache (preferred)
NOTIFY pgrst, 'reload schema';

-- Method 2: If above doesn't work, check current schema version
SELECT current_setting('search_path');

-- Method 3: Verify columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'niche_training'
AND column_name IN ('training_type', 'training_category', 'enrolled_courses', 'cohort_id')
ORDER BY ordinal_position;

-- Method 4: Grant explicit permissions on new columns (sometimes needed)
GRANT ALL ON niche_training TO authenticated;
GRANT ALL ON niche_training TO anon;
