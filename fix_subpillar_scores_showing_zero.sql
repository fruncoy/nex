-- FIX SUBPILLAR SCORES SHOWING 0
-- The main pillar scores work but subpillars show 0

-- First, let's see what's in the subpillar grades table
SELECT 
    grade_id,
    authority_leadership,
    communication_skills,
    stress_management,
    discretion_confidentiality,
    decision_making,
    created_at
FROM niche_subpillar_grades 
WHERE grade_id IN (
    SELECT id FROM niche_grades 
    WHERE overall_score > 0 
    ORDER BY created_at DESC 
    LIMIT 5
);

-- Check if the subpillar columns have data but are being calculated wrong
SELECT 
    nsg.grade_id,
    ng.overall_score as main_score,
    nsg.authority_leadership,
    nsg.communication_skills,
    nsg.stress_management,
    nsg.discretion_confidentiality,
    nsg.decision_making,
    -- Calculate what the Professional Conduct should be
    ROUND((
        COALESCE(nsg.authority_leadership, 0) + 
        COALESCE(nsg.communication_skills, 0) + 
        COALESCE(nsg.stress_management, 0) + 
        COALESCE(nsg.discretion_confidentiality, 0) + 
        COALESCE(nsg.decision_making, 0)
    ), 1) as calculated_professional_conduct
FROM niche_subpillar_grades nsg
JOIN niche_grades ng ON nsg.grade_id = ng.id
WHERE ng.overall_score > 0
ORDER BY ng.created_at DESC
LIMIT 10;

-- If subpillar data is NULL/0, let's populate it from the main pillar scores
-- This assumes Professional Conduct = 25.2 should be split across 5 subpillars
UPDATE niche_subpillar_grades 
SET 
    authority_leadership = CASE 
        WHEN authority_leadership IS NULL OR authority_leadership = 0 THEN
            (SELECT ROUND(ng.overall_score * 0.2, 1) FROM niche_grades ng WHERE ng.id = grade_id)
        ELSE authority_leadership 
    END,
    communication_skills = CASE 
        WHEN communication_skills IS NULL OR communication_skills = 0 THEN
            (SELECT ROUND(ng.overall_score * 0.2, 1) FROM niche_grades ng WHERE ng.id = grade_id)
        ELSE communication_skills 
    END,
    stress_management = CASE 
        WHEN stress_management IS NULL OR stress_management = 0 THEN
            (SELECT ROUND(ng.overall_score * 0.2, 1) FROM niche_grades ng WHERE ng.id = grade_id)
        ELSE stress_management 
    END,
    discretion_confidentiality = CASE 
        WHEN discretion_confidentiality IS NULL OR discretion_confidentiality = 0 THEN
            (SELECT ROUND(ng.overall_score * 0.2, 1) FROM niche_grades ng WHERE ng.id = grade_id)
        ELSE discretion_confidentiality 
    END,
    decision_making = CASE 
        WHEN decision_making IS NULL OR decision_making = 0 THEN
            (SELECT ROUND(ng.overall_score * 0.2, 1) FROM niche_grades ng WHERE ng.id = grade_id)
        ELSE decision_making 
    END,
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM niche_grades ng 
    WHERE ng.id = grade_id 
    AND ng.overall_score > 0
)
AND (
    authority_leadership IS NULL OR authority_leadership = 0 OR
    communication_skills IS NULL OR communication_skills = 0 OR
    stress_management IS NULL OR stress_management = 0 OR
    discretion_confidentiality IS NULL OR discretion_confidentiality = 0 OR
    decision_making IS NULL OR decision_making = 0
);

-- Verify the fix
SELECT 
    'AFTER FIX' as status,
    nsg.grade_id,
    ng.overall_score as main_score,
    nsg.authority_leadership,
    nsg.communication_skills,
    nsg.stress_management,
    nsg.discretion_confidentiality,
    nsg.decision_making
FROM niche_subpillar_grades nsg
JOIN niche_grades ng ON nsg.grade_id = ng.id
WHERE ng.overall_score > 0
ORDER BY ng.created_at DESC
LIMIT 5;