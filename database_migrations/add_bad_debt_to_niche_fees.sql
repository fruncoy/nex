-- Migration to add is_bad_debt column to niche_fees table
ALTER TABLE niche_fees ADD COLUMN IF NOT EXISTS is_bad_debt BOOLEAN DEFAULT FALSE;
