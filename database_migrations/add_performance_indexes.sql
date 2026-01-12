-- Performance optimization indexes for candidates and interviews tables

-- Candidates table indexes
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_inquiry_date ON candidates(inquiry_date DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_phone ON candidates(phone);
CREATE INDEX IF NOT EXISTS idx_candidates_name ON candidates(name);
CREATE INDEX IF NOT EXISTS idx_candidates_source ON candidates(source);
CREATE INDEX IF NOT EXISTS idx_candidates_assigned_to ON candidates(assigned_to);

-- Interviews table indexes
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_date_time ON interviews(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_outcome ON interviews(outcome);
CREATE INDEX IF NOT EXISTS idx_interviews_attended ON interviews(attended);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_candidates_status_date ON candidates(status, inquiry_date DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_date ON interviews(candidate_id, date_time DESC);