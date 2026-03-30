-- Remove PAF Paid Date column from clients table
-- This field should not be tracked in leads/clients system

ALTER TABLE clients DROP COLUMN IF EXISTS paf_paid_date;