import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, FileText, Eye, Edit, CheckCircle, Clock } from 'lucide-react'

interface KPIReport {
  id: string
  title: string
  period: string
  status: 'draft' | 'published'
  created_by: string
  created_at: string
  updated_at: string
}

export function KPIReportList() {
  const [reports, setReports] = useState<KPIReport[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [period, setPeriod] = useState('')
  const [saving, setSaving] = useState(false)
  const { staff, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { loadReports() }, [])

  const loadReports = async () => {
    const { data } = await supabase
      .from('kpi_reports')
      .select('id, title, period, status, created_by, created_at, updated_at')
      .order('period', { ascending: false })
    setReports(data || [])
    setLoading(false)
  }

  const createReport = async () => {
    if (!title.trim() || !period) return
    setSaving(true)
    const { data, error } = await supabase
      .from('kpi_reports')
      .insert({
        title: title.trim(),
        period,
        status: 'draft',
        created_by: staff?.name || user?.email || 'Unknown',
        section_business:    DEFAULT_SECTIONS.business,
        section_team:        DEFAULT_SECTIONS.team,
        section_marketing:   DEFAULT_SECTIONS.marketing,
        section_cs:          DEFAULT_SECTIONS.cs,
        section_recruitment: DEFAULT_SECTIONS.recruitment,
        section_training:    DEFAULT_SECTIONS.training,
        section_office:      DEFAULT_SECTIONS.office,
      })
      .select('id')
      .single()
    setSaving(false)
    if (!error && data) {
      setShowCreate(false)
      navigate(`/kpi-report/${data.id}/fill`)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#ae491e]"></div>
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KPI Reports</h1>
          <p className="text-gray-500 text-sm">Monthly performance reports</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#ae491e] text-white px-4 py-2 rounded-lg hover:bg-[#8a3414] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Report
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No reports yet</p>
          <p className="text-sm">Create your first monthly KPI report</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#ae491e]" />
                <div>
                  <p className="font-semibold text-gray-900">{r.title}</p>
                  <p className="text-xs text-gray-400">Created by {r.created_by} · {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${r.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {r.status === 'published' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {r.status === 'published' ? 'Published' : 'Draft'}
                </span>
                <button onClick={() => navigate(`/kpi-report/${r.id}/fill`)} className="flex items-center gap-1 text-xs text-gray-600 hover:text-[#ae491e] px-2 py-1 rounded hover:bg-gray-50 transition-colors">
                  <Edit className="w-3 h-3" /> Fill
                </button>
                <button onClick={() => navigate(`/kpi-report/${r.id}`)} className="flex items-center gap-1 text-xs text-gray-600 hover:text-[#ae491e] px-2 py-1 rounded hover:bg-gray-50 transition-colors">
                  <Eye className="w-3 h-3" /> View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">New KPI Report</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Name</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. April 2026"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#ae491e] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                <input
                  type="month"
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#ae491e] focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button
                onClick={createReport}
                disabled={saving || !title.trim() || !period}
                className="flex-1 px-4 py-2 text-sm text-white bg-[#ae491e] rounded-lg hover:bg-[#8a3414] disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create & Fill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Default KPI rows pre-filled from the template
const DEFAULT_SECTIONS = {
  business: [
    { kpi: 'Monthly Revenue (Total)', target: 'KES 1,200,000 / month', actual: '', comment: '', rag: null },
    { kpi: 'Gross Margin', target: '≥ 55% (quarterly review)', actual: '', comment: '', rag: null },
    { kpi: 'Training Revenue (Monthly)', target: 'KES 600,000 / month', actual: '', comment: '', rag: null },
    { kpi: 'Training Revenue Mix', target: 'Weekend 60% | Employer 20% | NGO 20%', actual: '', comment: '', rag: null },
    { kpi: 'Client Retention Rate', target: '≥ 40% within 6 months', actual: '', comment: '', rag: null },
    { kpi: 'Placement Success Rate (30-day)', target: '≥ 90% still active at Day 30', actual: '', comment: '', rag: null },
    { kpi: 'Placement Retention (3-month)', target: '≥ 85% after 3 months', actual: '', comment: '', rag: null },
    { kpi: 'Replacement Rate (guarantee)', target: '≤ 25% in 6 mths / ≤ 15% in 12 mths', actual: '', comment: '', rag: null },
    { kpi: 'Client Satisfaction Score (CSAT)', target: '≥ 9.0 / 10', actual: '', comment: '', rag: null },
    { kpi: 'Publishable Reviews Collected', target: '≥ 6 per month', actual: '', comment: '', rag: null },
    { kpi: 'System Utilisation (Zoho)', target: '≥ 90% interactions logged', actual: '', comment: '', rag: null },
  ],
  team: [
    { kpi: 'Client Brief → Shortlist Handoff Completeness', target: '≥ 95% of paying clients complete', actual: '', comment: '', rag: null },
    { kpi: 'Recruitment ↔ Training Pipeline Sync', target: '100% weekly sync; ≥ 80% actions closed', actual: '', comment: '', rag: null },
    { kpi: 'Supply Coverage Ratio', target: '≥ 1.5 candidates per paying client', actual: '', comment: '', rag: null },
    { kpi: 'Salary Fit Rate', target: '≥ 65% in 3 mths / ≥ 75% in 12 mths', actual: '', comment: '', rag: null },
    { kpi: 'Marketing Data Freshness', target: 'Submitted Mon 10am — 100% of weeks', actual: '', comment: '', rag: null },
  ],
  marketing: [
    { kpi: 'Profile Access Fee Conversions', target: '≥ 35 per month', actual: '', comment: '', rag: null },
    { kpi: 'Cost per Paying Lead', target: '≤ KES 2,000', actual: '', comment: '', rag: null },
    { kpi: 'Placement Fee Paying Leads Generated', target: '≥ 30 per month', actual: '', comment: '', rag: null },
    { kpi: 'Campaign Consistency', target: '≥ 90% on-time launches', actual: '', comment: '', rag: null },
    { kpi: 'Insight Loop Execution', target: '≥ 4 optimisations / month documented', actual: '', comment: '', rag: null },
    { kpi: 'Cost per Won Client — Google', target: 'Track monthly', actual: '', comment: '', rag: null },
    { kpi: 'Cost per Won Client — IG / Meta', target: 'Track monthly', actual: '', comment: '', rag: null },
    { kpi: 'Cost per Won Client — Overall', target: 'Track monthly', actual: '', comment: '', rag: null },
  ],
  cs: [
    { kpi: 'Client Onboarding Completion', target: '100% within 24 hrs of payment', actual: '', comment: '', rag: null },
    { kpi: 'Response Time SLA', target: '≤ 30 mins during business hours', actual: '', comment: '', rag: null },
    { kpi: 'Interview-to-Offer Cycle Time', target: '≤ 7 days average', actual: '', comment: '', rag: null },
    { kpi: 'Client Escalation Rate', target: '≤ 8% of active clients', actual: '', comment: '', rag: null },
    { kpi: 'Client Satisfaction Score (CSAT)', target: '≥ 9.0 / 10', actual: '', comment: '', rag: null },
    { kpi: 'Publishable Reviews Collected', target: '≥ 2 per month', actual: '', comment: '', rag: null },
  ],
  recruitment: [
    { kpi: 'Time to Shortlist (Paying Clients)', target: '≤ 72 hours for first shortlist', actual: '', comment: '', rag: null },
    { kpi: 'Candidate Pool Growth (Non-nanny roles)', target: '≥ 10 vetted chefs + ≥ 10 vetted drivers / month', actual: '', comment: '', rag: null },
    { kpi: 'Vetting Quality Compliance', target: '100% of candidates fully vetted', actual: '', comment: '', rag: null },
    { kpi: 'Placement Success Rate (30-day)', target: '≥ 90% day-30 success', actual: '', comment: '', rag: null },
    { kpi: 'Salary Alignment Accuracy', target: '≥ 85% candidates aligned pre-intro', actual: '', comment: '', rag: null },
  ],
  training: [
    { kpi: 'Training Completion Rate', target: '≥ 95% completion', actual: '', comment: '', rag: null },
    { kpi: 'Candidate Transformation Score', target: '≥ 20% improvement average', actual: '', comment: '', rag: null },
    { kpi: 'Placement Readiness Approval Accuracy', target: '≥ 85% of approved trainees succeed at Day 30', actual: '', comment: '', rag: null },
    { kpi: 'Post-Training Placement Success', target: '≥ 80% placed within 60 days', actual: '', comment: '', rag: null },
    { kpi: 'Employer Satisfaction (Trained Staff)', target: '≥ 90% satisfaction', actual: '', comment: '', rag: null },
    { kpi: 'Training Revenue (External/Sponsored)', target: 'KES target set monthly; MoM growth ≥ 10%', actual: '', comment: '', rag: null },
    { kpi: 'Program Development & Quality', target: '≥ 1 upgrade / month + quarterly review', actual: '', comment: '', rag: null },
  ],
  office: [
    { kpi: 'CRM Hygiene Score', target: '≥ 95% records complete', actual: '', comment: '', rag: null },
    { kpi: 'Follow-up SLA Compliance', target: '≥ 98% on-time', actual: '', comment: '', rag: null },
    { kpi: 'Payment Tracking Accuracy', target: '100% matched weekly', actual: '', comment: '', rag: null },
    { kpi: 'Scheduling Efficiency', target: 'Consults / interviews scheduled within 24 hrs', actual: '', comment: '', rag: null },
    { kpi: 'Institute Operational Readiness', target: '≥ 95% days fully ready', actual: '', comment: '', rag: null },
    { kpi: 'Weekly Ops Metrics Pack Delivered', target: '100% delivered by Mon 10am', actual: '', comment: '', rag: null },
  ],
}
