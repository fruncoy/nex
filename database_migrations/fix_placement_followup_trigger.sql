-- Fix placement follow-up trigger to create all 6 follow-ups (2, 4, 6, 8, 10, 12 weeks)

-- Update the trigger function to create 6 follow-ups instead of 3
CREATE OR REPLACE FUNCTION create_placement_followups()
RETURNS TRIGGER AS $$
BEGIN
  -- Create follow-up reminders for 2, 4, 6, 8, 10, and 12 weeks after placement start
  INSERT INTO placement_followups (client_id, placement_id, followup_type, scheduled_date)
  VALUES 
    (NEW.client_id, NEW.id, '2_week', NEW.start_date::date + INTERVAL '2 weeks'),
    (NEW.client_id, NEW.id, '4_week', NEW.start_date::date + INTERVAL '4 weeks'),
    (NEW.client_id, NEW.id, '6_week', NEW.start_date::date + INTERVAL '6 weeks'),
    (NEW.client_id, NEW.id, '8_week', NEW.start_date::date + INTERVAL '8 weeks'),
    (NEW.client_id, NEW.id, '10_week', NEW.start_date::date + INTERVAL '10 weeks'),
    (NEW.client_id, NEW.id, '12_week', NEW.start_date::date + INTERVAL '12 weeks');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate follow-ups for existing placements that don't have the full 6 follow-ups
DO $$
DECLARE
    placement_record RECORD;
BEGIN
    FOR placement_record IN 
        SELECT cp.id, cp.client_id, cp.start_date
        FROM client_placements cp
        WHERE (
            SELECT COUNT(*) 
            FROM placement_followups pf 
            WHERE pf.placement_id = cp.id
        ) < 6
    LOOP
        -- Delete existing follow-ups for this placement
        DELETE FROM placement_followups WHERE placement_id = placement_record.id;
        
        -- Create all 6 follow-ups
        INSERT INTO placement_followups (client_id, placement_id, followup_type, scheduled_date)
        VALUES 
            (placement_record.client_id, placement_record.id, '2_week', placement_record.start_date::date + INTERVAL '2 weeks'),
            (placement_record.client_id, placement_record.id, '4_week', placement_record.start_date::date + INTERVAL '4 weeks'),
            (placement_record.client_id, placement_record.id, '6_week', placement_record.start_date::date + INTERVAL '6 weeks'),
            (placement_record.client_id, placement_record.id, '8_week', placement_record.start_date::date + INTERVAL '8 weeks'),
            (placement_record.client_id, placement_record.id, '10_week', placement_record.start_date::date + INTERVAL '10 weeks'),
            (placement_record.client_id, placement_record.id, '12_week', placement_record.start_date::date + INTERVAL '12 weeks');
    END LOOP;
END $$;