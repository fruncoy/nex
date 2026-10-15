# NICHE Training Table - Setup Documentation

**Last Updated:** October 2026  
**Status:** ✅ Working

---

## Table: `niche_training`

### Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| candidate_id | uuid | Optional FK to candidates |
| name | text | Required |
| phone | text | Normalized to +254 format by trigger |
| role | text | Nanny / House Manager |
| status | text | Active / Graduated / Expelled / Suspended |
| course | text | Course name |
| cohort_id | uuid | FK to niche_cohorts |
| training_type | text | 2week / weekend / refresher |
| training_category | text | 2-Week Flagship / Short Course |
| enrolled_courses | text[] | Array (Short Course only) |
| certificate_token | text | For certificate verification |
| created_by | text | Staff name |
| updated_by | text | Staff name |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto-updated by trigger |

### Triggers

| Trigger | Status | Purpose |
|---------|--------|---------|
| `niche_training_updated_at` | ✅ ENABLED | Auto-updates `updated_at` on every change |
| `sync_training_to_candidates_trigger` | ✅ ENABLED | Syncs trainee status to niche_candidates after INSERT/UPDATE |
| `prevent_training_duplicates_trigger` | ⛔ DISABLED | Blocks duplicate phone numbers - **disable during bulk imports** |

### ⚠️ IMPORTANT: Duplicate Prevention Trigger

The `prevent_training_duplicates_trigger` is **intentionally disabled** to allow bulk imports.

**To enable it after all imports are done:**
```sql
ALTER TABLE niche_training ENABLE TRIGGER prevent_training_duplicates_trigger;
```

**To disable it before a bulk import:**
```sql
ALTER TABLE niche_training DISABLE TRIGGER prevent_training_duplicates_trigger;
```

---

## Functions

| Function | Purpose |
|----------|---------|
| `normalize_phone_niche(text)` | Normalizes Kenyan phone numbers to +254 format |
| `sync_niche_training_to_candidates()` | Trigger function - syncs status to niche_candidates |
| `prevent_niche_training_duplicates()` | Trigger function - blocks duplicate phones |

---

## RLS Policies

| Table | Policy | Role | Operations |
|-------|--------|------|-----------|
| niche_training | Allow all for authenticated | authenticated | ALL |
| niche_training | Public can view certificates | anon | SELECT (certificate_token only) |
| niche_candidates | Allow all for authenticated | authenticated | ALL |
| activity_logs | Allow all for authenticated | authenticated | ALL |

---

## How to Import Trainees (Per Cohort)

1. Go to **Niche Training** page in the app
2. Click **Import Trainees**
3. Select candidates from niche_candidates list
4. Select the cohort
5. Click **Import**

No database changes needed between cohorts. Everything is set up to work automatically.

---

## What Was Fixed (October 2026)

After security updates broke imports, these fixes were applied:

1. **Added missing columns**: `training_type`, `training_category`, `enrolled_courses`, `cohort_id`
2. **Fixed RLS policies**: Removed conflicting policies, created single clean policy
3. **Added GRANT permissions**: `authenticated` role needed explicit INSERT/UPDATE/DELETE grants
4. **Created missing function**: `normalize_phone_niche()` was referenced by triggers but didn't exist
5. **Fixed triggers**: Recreated `sync_training_to_candidates_trigger` and `prevent_training_duplicates_trigger`
6. **Fixed activity logger**: Was passing empty string as UUID - now skips logging if no user ID
7. **Fixed activity_logs**: Made `user_id` nullable to handle edge cases

---

## Troubleshooting: If Import Fails in Future

### Error: "relation does not exist" (42P01)
This is always a **permissions issue**, not a missing table. Check:
```sql
-- Check grants
SELECT grantee, privilege_type FROM information_schema.table_privileges
WHERE table_name = 'niche_training' AND grantee = 'authenticated';

-- Re-apply if missing
GRANT ALL PRIVILEGES ON niche_training TO authenticated;
NOTIFY pgrst, 'reload schema';
```

### Error: "function normalize_phone_niche does not exist"
A trigger is calling the missing function. Re-create it:
```sql
CREATE OR REPLACE FUNCTION normalize_phone_niche(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
    IF phone_input IS NULL OR phone_input = '' THEN RETURN phone_input; END IF;
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

### Error: "Duplicate phone number detected"
The duplicate prevention trigger is enabled. Either:
- Disable it for bulk imports: `ALTER TABLE niche_training DISABLE TRIGGER prevent_training_duplicates_trigger;`
- Or remove the duplicate from niche_training first

### PostgREST schema cache stale
After any schema change:
```sql
NOTIFY pgrst, 'reload schema';
```
