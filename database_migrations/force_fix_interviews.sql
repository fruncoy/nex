-- Force create interview records for any remaining INTERVIEW_SCHEDULED candidates
-- This handles cases where the previous script might have failed

DO $$
DECLARE
    candidate_record RECORD;
BEGIN
    FOR candidate_record IN 
        SELECT c.id, c.name, c.scheduled_date, c.assigned_to
        FROM candidates c
        LEFT JOIN interviews i ON c.id = i.candidate_id
        WHERE c.status = 'INTERVIEW_SCHEDULED' 
        AND i.id IS NULL
    LOOP
        INSERT INTO interviews (
            candidate_id,
            date_time,
            location,
            assigned_staff,
            attended,
            outcome,
            notes
        ) VALUES (
            candidate_record.id,
            COALESCE(candidate_record.scheduled_date, NOW() + INTERVAL '1 day'),
            'Office',
            candidate_record.assigned_to,
            false,
            null,
            'Auto-created to fix sync issue - ' || candidate_record.name
        );
        
        RAISE NOTICE 'Created interview for candidate: %', candidate_record.name;
    END LOOP;
END $$;