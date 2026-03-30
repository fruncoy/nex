@@ .. @@
 -- Add scheduled_date column for WILL GET BACK and TO BE CALLED statuses
 DO $$
 BEGIN
   IF NOT EXISTS (
     SELECT 1 FROM information_schema.columns
     WHERE table_name = 'candidates' AND column_name = 'scheduled_date'
   ) THEN
     ALTER TABLE candidates ADD COLUMN scheduled_date date;
   END IF;
 END $$;

+-- Ensure the scheduled_date column is properly added
+ALTER TABLE candidates ADD COLUMN IF NOT EXISTS scheduled_date date;
+
 -- Update existing candidates to have default roles if null