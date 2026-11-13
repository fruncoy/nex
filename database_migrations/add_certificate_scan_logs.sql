-- ============================================================
-- Certificate Scan Logs — tracks every QR scan event
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS certificate_scan_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scanned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  cert_token  TEXT NOT NULL,          -- e.g. NICHE0001A
  trainee_name TEXT,                  -- denormalised for quick display
  user_agent  TEXT,                   -- browser/device info from the scanner
  -- location is best-effort: browsers only share it with user permission
  -- we capture timezone as a lightweight proxy instead
  timezone    TEXT,                   -- Intl.DateTimeFormat().resolvedOptions().timeZone
  referrer    TEXT                    -- document.referrer (usually empty for QR scans)
);

-- Index for fast lookup by token (for the logs tab)
CREATE INDEX IF NOT EXISTS idx_scan_logs_cert_token
  ON certificate_scan_logs (cert_token);

-- Index for time-ordered display
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_at
  ON certificate_scan_logs (scanned_at DESC);

-- Allow public inserts (the verify page is public, no auth)
-- Only needed if RLS is ON for this table
ALTER TABLE certificate_scan_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert a scan log"
  ON certificate_scan_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can read scan logs"
  ON certificate_scan_logs
  FOR SELECT
  TO authenticated
  USING (true);
