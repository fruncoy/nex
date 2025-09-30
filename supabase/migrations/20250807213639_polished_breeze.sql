/*
  # Add archived column to updates table

  1. Schema Changes
    - Add archived column to updates table with default false
    - Update queries to filter out archived updates by default

  2. Business Logic
    - Archived updates are hidden from normal views
    - Can be restored if needed by setting archived = false
*/

-- Add archived column to updates table
ALTER TABLE updates ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- Create index for better performance when filtering archived updates
CREATE INDEX IF NOT EXISTS updates_archived_idx ON updates(archived);

-- Update existing records to not be archived
UPDATE updates SET archived = false WHERE archived IS NULL;