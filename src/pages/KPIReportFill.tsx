import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ChevronDown, ChevronRight, Eye, CheckCircle, Cloud, CloudOff, User } from 'lucide-react'

type RAG = 'green' | 'amber' | 'red' | null

interface KPIRow {
  kpi: string
  target: string
  actual: string
  comment: string
  rag: RAG
}

interface Contribution {
  staff_name: string
  section: string
  filled_at: string
}

interface Report {
  id: string
  title: string
  period: string
  status: 'draft' | 'published'
  highlights: string
  section_business: KPIRow[]
  section_team: KPIRow[]
  section_marketing: KPIRow[]
  section_cs: KPIRow[]
  section_recruitment: KPIRow[]
  section_training: KPIRow[]
  section_office: KPIRow[]
  analytics: Record<string, any>
}

const SECTION_META = [
  { key: 'business',    label: 'Business-Level KPIs',   color: '#ae491e' },
  { key: 'team',        label: 'Team-Level KPIs',        color: '#ae491e' },
  { key: 'marketing',   label: 'Marketing',              color: '#ae491e' },
  { key: 'cs',          label: 'Client Services',        color: '#ae491e' },
  { key: 'recruitment', label: 'Recruitment',            color: '#ae491e' },
  { key: 'training',    label: 'Training',               color: '#ae491e' },
  { key: 'office',      label: 'Office',                 color: '#ae491e' },
  { key: 'analytics',   label: 'Analytics & Social',     color: '#ae491e' },
]

const RAG_COLORS: Record<string, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-400',
  red:   'bg-red-500',
}

const ANALYTICS_FIELDS = [
  { key: 'total_inquiries',    label: 'Total Candidate Inquiries' },
  { key: 'joined_training',    label: 'Joined Training' },
  { key: 'graduated',          label: 'Graduated' },
  { key: 'placed',             label: 'Placed in Roles' },
  { key: 'client_leads',       label: 'Client Leads' },
  { key: 'converted_clients',  label: 'Converted Clients' },
  { key: 'lost_leads',         label: 'Lost Leads' },
  { key: 'total_placements',   label: 'Total Placements' },
  { key: 'revenue_placement',  label: 'Placement Revenue (KES)' },
  { key: 'revenue_training',   label: 'Training Revenue (KES)' },
  { key: 'marketing_spend',    label: 'Total Marketing Spend (KES)' },
  { key: 'cost_per_lead',      label: 'Cost per Paying Lead (KES)' },
  { key: 'fb_reach',           label: 'Facebook Reach' },
  { key: 'fb_followers',       label: 'Facebook Followers' },
  { key: 'ig_followers',       label: 'Instagram Followers' },
  { key: 'ig_reach',           label: 'Instagram Reach' },
  { key: 'tiktok_followers',   label: 'TikTok Followers' },
  { key: 'tiktok_views',       label: 'TikTok Video Views' },
]

function fillPct(rows: KPIRow[]) {
  if (!rows?.length) return 0
  return Math.round((rows.filter(r => r.actual?.trim()).length / rows.length) * 100)
}

function analyticsFillPct(analytics: Record<string, any>) {
  const filled = ANALYTICS_FIELDS.filter(f => analytics?.[f.key]?.toString().trim()).length
  return Math.round((filled / ANALYTICS_FIELDS.length) * 100)
}

function PctBadge({ pct }: { pct: number }) {
  const color = pct === 100 ? 'bg-green-100 text-green-700' : pct > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{pct}%</span>
}

export function KPIReportFill() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { staff } = useAuth()

  const [report, setReport] = useState<Report | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [expanded, setExpanded] = useState<Set<string>>(new Set(SECTION_META.map(s => s.key)))
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reportRef = useRef<Report | null>(null)
  const dirtySection = useRef<Set<string>>(new Set())

  useEffect(() => { loadReport() }, [id])

  const loadReport = async () => {
    const [{ data: rep }, { data: contribs }] = await Promise.all([
      supabase.from('kpi_reports').select('*').eq('id', id).single(),
      supabase.from('kpi_report_contributions').select('*').eq('report_id', id).order('filled_at', { ascending: false }),
    ])
    if (rep) { setReport(rep); reportRef.current = rep }
    setContributions(contribs || [])
    setLoading(false)
  }

  // Auto-save with 1.5s debounce
  const scheduleAutoSave = useCallback((updatedReport: Report, section: string) => {
    dirtySection.current.add(section)
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => doSave(updatedReport), 1500)
  }, [])

  const doSave = useCallback(async (rep: Report) => {
    setSaveState('saving')
    const { error } = await supabase
      .from('kpi_reports')
      .update({
        highlights:          rep.highlights,
        section_business:    rep.section_business,
        section_team:        rep.section_team,
        section_marketing:   rep.section_marketing,
        section_cs:          rep.section_cs,
        section_recruitment: rep.section_recruitment,
        section_training:    rep.section_training,
        section_office:      rep.section_office,
        analytics:           rep.analytics,
        updated_at:          new Date().toISOString(),
      })
      .eq('id', rep.id)

    if (error) { setSaveState('error'); return }

    // Log contributions for dirty sections
    if (staff?.name && dirtySection.current.size > 0) {
      const rows = [...dirtySection.current].map(sec => ({
        report_id:  rep.id,
        staff_name: staff.name,
        section:    sec,
        filled_at:  new Date().toISOString(),
      }))
      await supabase.from('kpi_report_contributions').upsert(rows, { onConflict: 'report_id,staff_name,section' })
      dirtySection.current.clear()
      // Refresh contributions
      const { data } = await supabase.from('kpi_report_contributions').select('*').eq('report_id', rep.id).order('filled_at', { ascending: false })
      setContributions(data || [])
    }

    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2500)
  }, [staff])

  const updateRow = (sectionKey: keyof Report, rowIdx: number, field: keyof KPIRow, value: string | RAG) => {
    if (!report) return
    const rows = [...(report[sectionKey] as KPIRow[])]
    rows[rowIdx] = { ...rows[rowIdx], [field]: value }
    const updated = { ...report, [sectionKey]: rows }
    setReport(updated)
    reportRef.current = updated
    scheduleAutoSave(updated, sectionKey.replace('section_', ''))
  }

  const updateHighlights = (val: string) => {
    if (!report) return
    const updated = { ...report, highlights: val }
    setReport(updated)
    reportRef.current = updated
    scheduleAutoSave(updated, 'highlights')
  }

  const updateAnalytics = (key: string, val: string) => {
    if (!report) return
    const updated = { ...report, analytics: { ...report.analytics, [key]: val } }
    setReport(updated)
    reportRef.current = updated
    scheduleAutoSave(updated, 'analytics')
  }

  const updateSectionNotes = (sectionKey: string, val: string) => {
    if (!report) return
    const updated = { ...report, analytics: { ...report.analytics, [`notes_${sectionKey}`]: val } }
    setReport(updated)
    reportRef.current = updated
    scheduleAutoSave(updated, sectionKey)
  }

  const publish = async () => {
    if (!report) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    await doSave(report)
    await supabase.from('kpi_reports').update({ status: 'published' }).eq('id', report.id)
    navigate(`/kpi-report/${report.id}`)
  }

  const toggleSection = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Who last filled a section
  const lastFilled = (section: string) => {
    const c = contributions.find(c => c.section === section || c.section === `section_${section}`)
    return c ? `${c.staff_name} · ${new Date(c.filled_at).toLocaleDateString()}` : null
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#ae491e]"></div>
    </div>
  )
  if (!report) return <div className="p-6 text-gray-500">Report not found.</div>

  const sk = (key: string): keyof Report => `section_${key}` as keyof Report

  // Overall fill %
  const allSections = ['business', 'team', 'marketing', 'cs', 'recruitment', 'training', 'office']
  const totalRows = allSections.reduce((s, k) => s + ((report[sk(k)] as KPIRow[])?.length || 0), 0)
  const filledRows = allSections.reduce((s, k) => s + ((report[sk(k)] as KPIRow[])?.filter(r => r.actual?.trim()).length || 0), 0)
  const overallPct = totalRows ? Math.round((filledRows / totalRows) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto p-6">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{report.title} — KPI Report</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-gray-500">Filling as <span className="font-medium text-[#ae491e]">{staff?.name || 'Unknown'}</span></span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-sm text-gray-500">Overall: <span className="font-semibold">{overallPct}%</span> filled</span>
            {/* Save indicator */}
            <span className={`flex items-center gap-1 text-xs ${saveState === 'saving' ? 'text-amber-500' : saveState === 'saved' ? 'text-green-600' : saveState === 'error' ? 'text-red-500' : 'text-gray-300'}`}>
              {saveState === 'error' ? <CloudOff className="w-3.5 h-3.5" /> : <Cloud className="w-3.5 h-3.5" />}
              {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save failed' : 'Auto-save on'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/kpi-report/${report.id}`)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button
            onClick={publish}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#ae491e] text-white rounded-lg hover:bg-[#8a3414] transition-colors font-medium"
          >
            <CheckCircle className="w-4 h-4" /> Publish
          </button>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Overall completion</span>
          <span className="font-semibold text-gray-700">{filledRows} / {totalRows} KPIs filled</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#ae491e] rounded-full transition-all duration-500" style={{ width: `${overallPct}%` }} />
        </div>
        {/* Per-section mini bars */}
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mt-3">
          {allSections.map(k => {
            const pct = fillPct((report[sk(k)] as KPIRow[]) || [])
            return (
              <div key={k} className="text-center">
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-[#ae491e]/60 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-gray-400 capitalize">{k === 'cs' ? 'CS' : k}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Highlights */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3">
        <button onClick={() => toggleSection('highlights')} className="w-full flex items-center justify-between px-5 py-3 bg-[#ae491e]/5 hover:bg-[#ae491e]/10 transition-colors">
          <div className="flex items-center gap-2">
            {expanded.has('highlights') ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            <span className="font-semibold text-sm text-[#ae491e]">Executive Summary / Monthly Highlights</span>
          </div>
          <PctBadge pct={report.highlights?.trim() ? 100 : 0} />
        </button>
        {expanded.has('highlights') && (
          <div className="p-4">
            <textarea
              value={report.highlights || ''}
              onChange={e => updateHighlights(e.target.value)}
              rows={5}
              placeholder="Write a brief summary of the month — wins, blockers, key numbers..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#ae491e] focus:border-transparent resize-none"
            />
            {lastFilled('highlights') && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><User className="w-3 h-3" /> Last edited by {lastFilled('highlights')}</p>
            )}
          </div>
        )}
      </div>

      {/* KPI Sections */}
      {SECTION_META.filter(s => s.key !== 'analytics').map(({ key, label }) => {
        const rows = (report[sk(key)] as KPIRow[]) || []
        const pct = fillPct(rows)
        const isOpen = expanded.has(key)
        const last = lastFilled(key)

        return (
          <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3">
            <button onClick={() => toggleSection(key)} className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <span className="font-semibold text-sm text-gray-800">{label}</span>
                {last && (
                  <span className="hidden md:flex items-center gap-1 text-xs text-gray-400">
                    <User className="w-3 h-3" />{last}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{rows.filter(r => r.actual?.trim()).length}/{rows.length}</span>
                <PctBadge pct={pct} />
              </div>
            </button>

            {isOpen && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#ae491e] text-white">
                        <th className="text-left px-4 py-2 w-[28%]">KPI</th>
                        <th className="text-left px-4 py-2 w-[20%]">Target</th>
                        <th className="text-left px-4 py-2 w-[16%]">Actual</th>
                        <th className="text-left px-4 py-2 w-[27%]">Comment</th>
                        <th className="text-center px-4 py-2 w-[9%]">RAG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f9ece6]/30'}>
                          <td className="px-4 py-2 font-medium text-gray-800 border-b border-gray-100">{row.kpi}</td>
                          <td className="px-4 py-2 text-gray-400 font-mono border-b border-gray-100">{row.target}</td>
                          <td className="px-4 py-2 border-b border-gray-100">
                            <input
                              value={row.actual || ''}
                              onChange={e => updateRow(sk(key), i, 'actual', e.target.value)}
                              placeholder="—"
                              className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-[#ae491e] focus:border-transparent bg-white"
                            />
                          </td>
                          <td className="px-4 py-2 border-b border-gray-100">
                            <input
                              value={row.comment || ''}
                              onChange={e => updateRow(sk(key), i, 'comment', e.target.value)}
                              placeholder="Add comment..."
                              className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-[#ae491e] focus:border-transparent bg-white"
                            />
                          </td>
                          <td className="px-4 py-2 border-b border-gray-100">
                            <div className="flex gap-1 justify-center">
                              {(['green', 'amber', 'red'] as RAG[]).map(c => (
                                <button
                                  key={c!}
                                  onClick={() => updateRow(sk(key), i, 'rag', row.rag === c ? null : c)}
                                  className={`w-3.5 h-3.5 rounded-full transition-all ${RAG_COLORS[c!]} ${row.rag === c ? 'opacity-100 scale-110 ring-2 ring-offset-1 ring-gray-300' : 'opacity-20 hover:opacity-60'}`}
                                />
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Section notes */}
                <div className="px-4 py-3 border-t border-gray-100 bg-[#f9ece6]/20">
                  <textarea
                    value={(report.analytics as any)[`notes_${key}`] || ''}
                    onChange={e => updateSectionNotes(key, e.target.value)}
                    rows={2}
                    placeholder="Section notes — key observations, wins, blockers..."
                    className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-[#ae491e] focus:border-transparent resize-none bg-white"
                  />
                </div>
              </>
            )}
          </div>
        )
      })}

      {/* Analytics & Social */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3">
        <button onClick={() => toggleSection('analytics')} className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-2">
            {expanded.has('analytics') ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            <span className="font-semibold text-sm text-gray-800">Analytics & Social</span>
            {lastFilled('analytics') && (
              <span className="hidden md:flex items-center gap-1 text-xs text-gray-400">
                <User className="w-3 h-3" />{lastFilled('analytics')}
              </span>
            )}
          </div>
          <PctBadge pct={analyticsFillPct(report.analytics)} />
        </button>

        {expanded.has('analytics') && (
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ANALYTICS_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input
                    value={(report.analytics as any)[key] || ''}
                    onChange={e => updateAnalytics(key, e.target.value)}
                    placeholder="—"
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-[#ae491e] focus:border-transparent"
                  />
                </div>
              ))}
            </div>
            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">Social Media Notes</label>
              <textarea
                value={(report.analytics as any)['notes_social'] || ''}
                onChange={e => updateAnalytics('notes_social', e.target.value)}
                rows={3}
                placeholder="Key social media observations, top posts, recommendations..."
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#ae491e] focus:border-transparent resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Contributions log */}
      {contributions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-20">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Who filled what</h3>
          <div className="space-y-1.5">
            {contributions.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-gray-400" />
                  <span className="font-medium text-gray-700">{c.staff_name}</span>
                  <span className="text-gray-400">filled</span>
                  <span className="capitalize text-[#ae491e] font-medium">{c.section.replace('section_', '')}</span>
                </div>
                <span className="text-gray-400">{new Date(c.filled_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between z-40 lg:left-64">
        <div className="flex items-center gap-3">
          <div className="h-2 w-32 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#ae491e] rounded-full transition-all" style={{ width: `${overallPct}%` }} />
          </div>
          <span className="text-sm text-gray-500">{overallPct}% complete</span>
          <span className={`flex items-center gap-1 text-xs ${saveState === 'saving' ? 'text-amber-500' : saveState === 'saved' ? 'text-green-600' : saveState === 'error' ? 'text-red-500' : 'text-gray-300'}`}>
            <Cloud className="w-3.5 h-3.5" />
            {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'All changes saved' : saveState === 'error' ? 'Save failed' : 'Auto-save on'}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/kpi-report/${report.id}`)} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button onClick={publish} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#ae491e] text-white rounded-lg hover:bg-[#8a3414] font-medium">
            <CheckCircle className="w-4 h-4" /> Publish Report
          </button>
        </div>
      </div>

    </div>
  )
}
