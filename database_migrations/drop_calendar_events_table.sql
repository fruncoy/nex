-- Drop calendar_events table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
    DROP TABLE IF EXISTS calendar_events;
  END IF;
END $$;
