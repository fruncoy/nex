/*
  # Update KPI Targets with Correct Roles and Values

  1. Clear existing KPI targets
  2. Insert correct KPI targets based on provided specifications
  3. Update roles to: Overall, Marketing Specialist, Client Services Specialist, Recruitment Specialist

  4. KPI Structure:
    - Overall (Business-Level KPIs)
    - Marketing Specialist
    - Client Services Specialist  
    - Recruitment Specialist
*/

-- Clear existing KPI targets
DELETE FROM kpi_targets;

-- Insert Business-Level KPIs (Overall role)
INSERT INTO kpi_targets (role, kpi_name, target_value, unit, is_inverse, requires_event_date) VALUES
  ('Overall', 'Revenue Growth', 12, '%', false, false),
  ('Overall', 'Client Retention Rate', 40, '%', false, false),
  ('Overall', 'Candidate Retention (Quality of Placement)', 85, '%', false, false),
  ('Overall', 'System Utilization (Zoho Discipline)', 90, '%', false, false),
  ('Overall', 'Client Satisfaction Score', 8.5, 'score', false, false),
  ('Overall', 'Client Reviews Obtained (Publishable Reviews)', 5, 'count', false, false);

-- Insert Marketing Specialist KPIs
INSERT INTO kpi_targets (role, kpi_name, target_value, unit, is_inverse, requires_event_date) VALUES
  ('Marketing Specialist', 'Paying Leads Generated', 15, 'count', false, false),
  ('Marketing Specialist', 'Cost per Paying Lead', 2000, 'KES', true, false),
  ('Marketing Specialist', 'Campaign Consistency', 90, '%', false, false),
  ('Marketing Specialist', 'Zoho CRM Lead Logging', 100, '%', false, false);

-- Insert Client Services Specialist KPIs
INSERT INTO kpi_targets (role, kpi_name, target_value, unit, is_inverse, requires_event_date) VALUES
  ('Client Services Specialist', 'Client Onboarding Completion', 95, '%', false, false),
  ('Client Services Specialist', 'Response Time (Zoho Desk)', 2, 'hours', true, false),
  ('Client Services Specialist', 'Client Escalation Rate', 10, '%', true, false),
  ('Client Services Specialist', 'Client Satisfaction Score', 8.5, 'score', false, false),
  ('Client Services Specialist', 'Publishable Reviews Collected', 50, '%', false, false);

-- Insert Recruitment Specialist KPIs
INSERT INTO kpi_targets (role, kpi_name, target_value, unit, is_inverse, requires_event_date) VALUES
  ('Recruitment Specialist', 'Time to Placement', 10, 'days', true, true),
  ('Recruitment Specialist', 'Candidate Pool Growth', 20, 'count', false, false),
  ('Recruitment Specialist', 'Candidate Retention (Quality)', 85, '%', false, false),
  ('Recruitment Specialist', 'Recruitment Step Compliance', 100, '%', false, false);