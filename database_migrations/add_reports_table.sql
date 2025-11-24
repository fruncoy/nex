-- Create reports table for storing generated business reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policy
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all reports
CREATE POLICY "Allow authenticated users to read reports" ON reports
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert reports
CREATE POLICY "Allow authenticated users to insert reports" ON reports
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete reports
CREATE POLICY "Allow authenticated users to delete reports" ON reports
    FOR DELETE USING (auth.role() = 'authenticated');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();