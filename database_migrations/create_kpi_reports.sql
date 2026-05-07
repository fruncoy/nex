-- KPI Reports table
-- One row per report (month)
-- sections stored as JSONB — each section has rows with { kpi, target, actual, comment, rag }

CREATE TABLE public.kpi_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,                        -- e.g. "March 2026"
  period text NOT NULL,                       -- e.g. "2026-03"
  status text NOT NULL DEFAULT 'draft'        -- draft | published
    CHECK (status IN ('draft', 'published')),

  -- Executive summary
  highlights text,

  -- Sections: each is an array of { kpi, target, actual, comment, rag }
  -- rag: 'green' | 'amber' | 'red' | null
  section_business   jsonb DEFAULT '[]'::jsonb,
  section_team       jsonb DEFAULT '[]'::jsonb,
  section_marketing  jsonb DEFAULT '[]'::jsonb,
  section_cs         jsonb DEFAULT '[]'::jsonb,
  section_recruitment jsonb DEFAULT '[]'::jsonb,
  section_training   jsonb DEFAULT '[]'::jsonb,
  section_office     jsonb DEFAULT '[]'::jsonb,

  -- Analytics page (free-form numbers)
  analytics          jsonb DEFAULT '{}'::jsonb,

  -- Social insights (free-form)
  social             jsonb DEFAULT '{}'::jsonb,

  -- Audit
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  CONSTRAINT kpi_reports_pkey PRIMARY KEY (id),
  CONSTRAINT kpi_reports_period_key UNIQUE (period)
);

-- Track which staff filled which section and when
CREATE TABLE public.kpi_report_contributions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.kpi_reports(id) ON DELETE CASCADE,
  staff_name text NOT NULL,
  section text NOT NULL,   -- 'business' | 'team' | 'marketing' | 'cs' | 'recruitment' | 'training' | 'office'
  filled_at timestamp with time zone DEFAULT now(),
  CONSTRAINT kpi_report_contributions_pkey PRIMARY KEY (id),
  CONSTRAINT kpi_contributions_unique UNIQUE (report_id, staff_name, section)
);
