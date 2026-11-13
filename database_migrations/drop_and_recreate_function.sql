-- DROP AND RECREATE FUNCTION WITH CORRECT RETURN TYPE
-- PostgreSQL requires dropping the function first when changing return type

-- 1. Drop the existing function
DROP FUNCTION IF EXISTS force_sync_niche_candidates();

-- 2. Recreate the function with renamed return columns to avoid conflicts
CREATE OR REPLACE FUNCTION force_sync_niche_candidates()
RETURNS TABLE(
    sync_action TEXT,
    sync_phone TEXT,
    sync_name TEXT,
    sync_old_status TEXT,
    sync_new_status TEXT
) AS $$
BEGIN
    -- Add expelled trainees to blacklist during sync
    INSERT INTO blacklist (name, phone, reason, created_by, created_at)
    SELECT DISTINCT
        nt.name,
        normalize_phone_niche(nt.phone),
        'Expelled from NICHE Training',
        'FORCE_SYNC',
        NOW()
    FROM niche_training nt
    WHERE nt.status = 'Expelled'
    AND nt.phone IS NOT NULL 
    AND nt.phone != ''
    ON CONFLICT (phone) DO UPDATE SET
        reason = EXCLUDED.reason,
        updated_at = NOW();

    -- Return updated records
    RETURN QUERY
    WITH updates AS (
        UPDATE niche_candidates nc
        SET 
            status = CASE 
                WHEN nt.status = 'Active' THEN 'Active in Training'
                WHEN nt.status = 'Graduated' THEN 'Graduated'
                WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'
                ELSE nt.status
            END,
            category = CASE 
                WHEN nt.training_type = 'weekend' THEN 'Short Course'
                ELSE '2-Week Flagship'
            END
        FROM niche_training nt
        WHERE normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
        AND nc.status != CASE 
            WHEN nt.status = 'Active' THEN 'Active in Training'
            WHEN nt.status = 'Graduated' THEN 'Graduated'
            WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'
            ELSE nt.status
        END
        RETURNING 
            'UPDATED'::TEXT as sync_action,
            nc.phone as sync_phone,
            nc.name as sync_name,
            nc.status as sync_old_status,
            CASE 
                WHEN nt.status = 'Active' THEN 'Active in Training'
                WHEN nt.status = 'Graduated' THEN 'Graduated'
                WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'
                ELSE nt.status
            END as sync_new_status
    )
    SELECT * FROM updates;
    
    -- Return inserted records (excluding expelled)
    RETURN QUERY
    WITH inserts AS (
        INSERT INTO niche_candidates (
            name, phone, source, role, inquiry_date, status, added_by, category, created_at
        )
        SELECT DISTINCT
            nt.name,
            normalize_phone_niche(nt.phone),
            'NICHE Training',
            nt.role,
            COALESCE(nt.created_at::date, CURRENT_DATE),
            CASE 
                WHEN nt.status = 'Active' THEN 'Active in Training'
                WHEN nt.status = 'Graduated' THEN 'Graduated'
                WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'
                ELSE nt.status
            END,
            'FORCE_SYNC',
            CASE 
                WHEN nt.training_type = 'weekend' THEN 'Short Course'
                ELSE '2-Week Flagship'
            END,
            nt.created_at
        FROM niche_training nt
        WHERE nt.phone IS NOT NULL 
        AND nt.phone != ''
        AND nt.status != 'Expelled'  -- Don't create candidates for expelled
        AND NOT EXISTS (
            SELECT 1 FROM niche_candidates nc 
            WHERE normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
        )
        RETURNING 
            'INSERTED'::TEXT as sync_action,
            phone as sync_phone,
            name as sync_name,
            'N/A'::TEXT as sync_old_status,
            status as sync_new_status
    )
    SELECT * FROM inserts;
END;
$$ LANGUAGE plpgsql;

-- 3. Test the recreated function
SELECT 'Testing recreated function...' as test_step;
SELECT * FROM force_sync_niche_candidates();

-- 4. Check final results
SELECT 
    'Final sync status' as info,
    (SELECT COUNT(*) FROM blacklist WHERE reason = 'Expelled from NICHE Training') as expelled_in_blacklist,
    (SELECT COUNT(*) FROM niche_candidates WHERE status = 'BLACKLISTED') as blacklisted_candidates,
    (SELECT COUNT(*) FROM niche_candidates WHERE status = 'Active in Training') as active_in_training,
    (SELECT COUNT(*) FROM niche_candidates WHERE status = 'Graduated') as graduated_candidates;

-- 5. Final duplicate check
WITH phone_counts AS (
    SELECT 
        normalize_phone_niche(phone) as norm_phone,
        COUNT(*) as count
    FROM (
        SELECT phone FROM niche_candidates WHERE phone IS NOT NULL AND phone != ''
        UNION ALL
        SELECT phone FROM niche_training WHERE phone IS NOT NULL AND phone != ''
    ) all_phones
    GROUP BY normalize_phone_niche(phone)
    HAVING COUNT(*) > 1
)
SELECT 
    'Final duplicate check' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN 'SUCCESS: No duplicates found! 🎉'
        ELSE CONCAT('WARNING: ', COUNT(*), ' duplicate phone numbers still exist')
    END as result,
    COUNT(*) as duplicate_phone_numbers
FROM phone_counts;

SELECT 'Function successfully recreated and tested! 🎉' as final_result;