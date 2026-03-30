-- Create calendar_events table
CREATE TABLE calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('INTERNAL', 'EXTERNAL')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES staff(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all calendar events" ON calendar_events
  FOR SELECT USING (true);

CREATE POLICY "Users can insert calendar events" ON calendar_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update calendar events" ON calendar_events
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete calendar events" ON calendar_events
  FOR DELETE USING (true);

-- Add index for performance
CREATE INDEX idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX idx_calendar_events_type ON calendar_events(event_type);