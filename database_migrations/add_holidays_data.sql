-- Insert holiday data
INSERT INTO calendar_events (title, event_date, event_type) VALUES
('Jamhuri Day (Republic Day)', '2025-12-12', 'EXTERNAL'),
('Christmas Day', '2025-12-25', 'EXTERNAL'),
('Boxing Day / Utamaduni Day', '2025-12-26', 'EXTERNAL'),
('New Year''s Day', '2026-01-01', 'EXTERNAL'),
('Eid al-Fitr (End of Ramadan)', '2026-03-21', 'EXTERNAL'),
('Good Friday', '2026-04-03', 'EXTERNAL'),
('Easter Monday', '2026-04-06', 'EXTERNAL'),
('Labour Day / May Day', '2026-05-01', 'EXTERNAL'),
('Eid al-Adha', '2026-05-27', 'EXTERNAL'),
('Madaraka Day', '2026-06-01', 'EXTERNAL'),
('Mazingira Day', '2026-10-10', 'EXTERNAL'),
('Mashujaa Day', '2026-10-20', 'EXTERNAL'),
('Jamhuri Day', '2026-12-12', 'EXTERNAL'),
('Christmas Day', '2026-12-25', 'EXTERNAL'),
('Boxing Day / Utamaduni Day', '2026-12-26', 'EXTERNAL');

-- Insert Sundays for 2025 (remaining months)
INSERT INTO calendar_events (title, event_date, event_type) 
SELECT 'Office Closed', date_series, 'EXTERNAL'
FROM generate_series('2025-12-01'::date, '2025-12-31'::date, '1 day'::interval) AS date_series
WHERE EXTRACT(DOW FROM date_series) = 0;

-- Insert Sundays for 2026
INSERT INTO calendar_events (title, event_date, event_type) 
SELECT 'Office Closed', date_series, 'EXTERNAL'
FROM generate_series('2026-01-01'::date, '2026-12-31'::date, '1 day'::interval) AS date_series
WHERE EXTRACT(DOW FROM date_series) = 0;