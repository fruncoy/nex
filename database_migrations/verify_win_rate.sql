-- Verify the exact win rate calculation
SELECT 
    'WIN_RATE_CALCULATION' as type,
    COUNT(*) as total_candidates,
    SUM(CASE WHEN status = 'Graduated' THEN 1 ELSE 0 END) as graduated_candidates,
    ROUND((SUM(CASE WHEN status = 'Graduated' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 0) as win_rate_percentage
FROM niche_candidates;

-- Show the exact numbers
SELECT 
    COUNT(*) as total_niche_candidates
FROM niche_candidates;

SELECT 
    COUNT(*) as graduated_niche_candidates  
FROM niche_candidates 
WHERE status = 'Graduated';