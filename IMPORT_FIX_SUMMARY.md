# Cohort 17 Import Fix Summary

**Date:** Today
**Issue:** Unable to import trainees from niche_candidates to niche_training
**Error:** `relation "niche_training" does not exist` (404)

## Root Causes Found

1. **Missing Columns**: `training_type`, `training_category`, `enrolled_courses`, `cohort_id` were not in the database
2. **Missing Table Grants**: `authenticated` role didn't have INSERT permission on `niche_training`
3. **Missing Function**: `normalize_phone_niche()` function didn't exist but triggers referenced it
4. **RLS Policies**: Had multiple conflicting policies that were blocking INSERT
5. **Same issues** on `niche_candidates` and `activity_logs` tables

## Solutions Applied

### 1. Added Missing Columns
```sql
ALTER TABLE niche_training 
ADD COLUMN IF NOT EXISTS training_type TEXT DEFAULT '2week',
ADD COLUMN IF NOT EXISTS training_category TEXT,
ADD COLUMN IF NOT EXISTS enrolled_courses TEXT[],
ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES niche_cohorts(id);
```

### 2. Fixed RLS Policies
```sql
DROP POLICY IF EXISTS "Authenticated users have full access" ON niche_training;
CREATE POLICY "Allow all for authenticated"
  ON niche_training FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

### 3. Granted Permissions
```sql
GRANT ALL PRIVILEGES ON niche_training TO authenticated;
GRANT ALL PRIVILEGES ON niche_candidates TO authenticated;
GRANT ALL PRIVILEGES ON activity_logs TO authenticated;
```

### 4. Created Missing Function
```sql
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
```

### 5. Temporarily Disabled User Triggers
During import only - triggers were calling missing functions or had dependencies not ready.

### 6. Fixed activity_logs UUID Issue
```sql
ALTER TABLE activity_logs ALTER COLUMN user_id DROP NOT NULL;
```

## Files to Keep

- `create_missing_normalize_function.sql` - Has the normalize function
- `fix_niche_candidates_and_activity_logs.sql` - Fixes for related tables
- `disable_user_triggers_only.sql` - How to disable/enable triggers safely

## Files to Delete (Debug/Test Files)

All files with `fix_`, `test_`, `debug_`, `diagnose_`, `verify_`, `clean_` prefixes created today.

## Post-Import Steps Completed

✅ Re-enabled triggers on niche_training
✅ Reloaded PostgREST schema
✅ Verified import success

## For Future Imports

1. Ensure all migrations in `database_migrations/` folder have been run on production
2. Check that all trigger functions exist before enabling triggers
3. Verify GRANT permissions on all tables the authenticated role needs
4. Use `NOTIFY pgrst, 'reload schema';` after any schema changes

## Key Learning

The error "relation does not exist" (42P01) doesn't always mean the table is missing. It can mean:
- RLS policies are blocking access
- GRANT permissions are missing
- PostgREST schema cache is stale
- Triggers reference missing functions

Always check:
1. Table exists: `SELECT * FROM information_schema.tables WHERE table_name = 'xxx';`
2. Grants exist: `SELECT * FROM information_schema.table_privileges WHERE table_name = 'xxx';`
3. Policies exist: `SELECT * FROM pg_policies WHERE tablename = 'xxx';`
4. Functions exist: `SELECT * FROM pg_proc WHERE proname = 'xxx';`
5. PostgREST cache: `NOTIFY pgrst, 'reload schema';`
