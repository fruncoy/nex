-- Create niche_fees table for fee management
CREATE TABLE IF NOT EXISTS niche_fees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES niche_training(id) ON DELETE CASCADE,
  course_fee INTEGER NOT NULL, -- Total course fee from niche_courses
  payment_plan TEXT NOT NULL DEFAULT 'Full' CHECK (payment_plan IN ('Full', 'Installments')),
  total_paid INTEGER DEFAULT 0,
  balance_due INTEGER GENERATED ALWAYS AS (course_fee - total_paid) STORED,
  payment_status TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Partial', 'Paid', 'Overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create niche_payments table for payment history
CREATE TABLE IF NOT EXISTS niche_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fee_id UUID NOT NULL REFERENCES niche_fees(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'M-Pesa', 'Bank Transfer', 'Card')),
  reference_number TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE niche_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE niche_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to manage fees" ON niche_fees
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage payments" ON niche_payments
  FOR ALL TO authenticated USING (true);

-- Create indexes
CREATE INDEX idx_niche_fees_training_id ON niche_fees(training_id);
CREATE INDEX idx_niche_fees_payment_status ON niche_fees(payment_status);
CREATE INDEX idx_niche_payments_fee_id ON niche_payments(fee_id);
CREATE INDEX idx_niche_payments_date ON niche_payments(payment_date);

-- Create function to update payment status automatically
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE niche_fees 
  SET payment_status = CASE 
    WHEN total_paid = 0 THEN 'Pending'
    WHEN total_paid >= course_fee THEN 'Paid'
    ELSE 'Partial'
  END,
  updated_at = NOW()
  WHERE id = NEW.fee_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update payment status when payments are added
CREATE TRIGGER update_payment_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON niche_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_status();