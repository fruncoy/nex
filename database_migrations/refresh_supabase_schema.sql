-- Refresh Supabase schema cache
-- Run this in your Supabase SQL editor to refresh the schema cache

NOTIFY pgrst, 'reload schema';