-- Add total_fee and amount_paid columns to bad_debt_contacts
-- amount_owed is computed in the app as (total_fee - amount_paid)

ALTER TABLE bad_debt_contacts
  ADD COLUMN IF NOT EXISTS total_fee numeric,
  ADD COLUMN IF NOT EXISTS amount_paid numeric;

-- Migrate existing fee_balance data into total_fee (treat old balance as total fee, paid = 0)
UPDATE bad_debt_contacts
SET total_fee = fee_balance, amount_paid = 0
WHERE fee_balance IS NOT NULL AND total_fee IS NULL;
