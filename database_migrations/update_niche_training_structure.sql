-- Update niche_training table structure for new requirements

-- Add new columns to niche_training
ALTER TABLE niche_training 
ADD COLUMN IF NOT EXISTS training_type TEXT DEFAULT '2week' CHECK (training_type IN ('2week', 'weekend', 'refresher')),
ADD COLUMN IF NOT EXISTS accommodation_type TEXT CHECK (accommodation_type IN ('live_in', 'live_out')),
ADD COLUMN IF NOT EXISTS enrolled_courses TEXT[]; -- Array of course names for multiple enrollments

-- Add sponsored_amount column to niche_fees table
ALTER TABLE niche_fees 
ADD COLUMN IF NOT EXISTS sponsored_amount INTEGER DEFAULT 0;

-- Update balance_due calculation to use (course_fee - sponsored_amount - total_paid)
ALTER TABLE niche_fees 
DROP COLUMN IF EXISTS balance_due;

ALTER TABLE niche_fees 
ADD COLUMN balance_due INTEGER GENERATED ALWAYS AS (course_fee - sponsored_amount - total_paid) STORED;

-- Create function to auto-assign dates from cohort
CREATE OR REPLACE FUNCTION assign_dates_from_cohort()
RETURNS TRIGGER AS $$
BEGIN
  -- If cohort_id is provided and dates are not set, get dates from cohort
  IF NEW.cohort_id IS NOT NULL AND (NEW.date_started IS NULL OR NEW.date_completed IS NULL) THEN
    SELECT start_date, end_date 
    INTO NEW.date_started, NEW.date_completed
    FROM niche_cohorts 
    WHERE id = NEW.cohort_id;
  END IF;
  
  -- If dates are provided but no cohort_id, find matching cohort
  IF NEW.cohort_id IS NULL AND NEW.date_started IS NOT NULL THEN
    SELECT id 
    INTO NEW.cohort_id
    FROM niche_cohorts 
    WHERE NEW.date_started >= start_date AND NEW.date_started <= end_date
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-assigning dates
DROP TRIGGER IF EXISTS assign_dates_trigger ON niche_training;
CREATE TRIGGER assign_dates_trigger
  BEFORE INSERT OR UPDATE ON niche_training
  FOR EACH ROW
  EXECUTE FUNCTION assign_dates_from_cohort();

-- Update payment status function to use (course_fee - sponsored_amount)
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE niche_fees 
  SET payment_status = CASE 
    WHEN total_paid = 0 THEN 'Pending'
    WHEN total_paid >= (course_fee - sponsored_amount) THEN 'Paid'
    ELSE 'Partial'
  END,
  updated_at = NOW()
  WHERE id = COALESCE(NEW.fee_id, OLD.fee_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;