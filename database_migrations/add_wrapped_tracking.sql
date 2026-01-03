-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage their own wrapped views" ON wrapped_views;

-- Drop table if it exists to recreate with new schema
DROP TABLE IF EXISTS wrapped_views;

-- Create table to track wrapped views
CREATE TABLE wrapped_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  has_viewed_wrapped BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE wrapped_views ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own wrapped views
CREATE POLICY "Users can manage their own wrapped views" ON wrapped_views
  FOR ALL USING (user_id = auth.uid());