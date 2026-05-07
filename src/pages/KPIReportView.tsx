import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Edit, Printer } from 'lucide-react'

interface KPIRow { kpi: string; target: string; actual: string; comment: string; rag: string | null }
interface Report {
  id: string; title: string; period: string; status: string; highlights: string
  section_business: KPIRow[]; section_team: KPIRow[]; section_marketing: KPIRow[]
  section_cs: KPIRow[]; section_recruitment: KPIRow[]; section_training: KPIRow[]; section_office: KPIRow[]
  analytics: Record<string, any>
}

const RAG_DOT: Record<string, string> = { green: 'bg-green-500', amber: 'bg-amber-400', red: 'bg-red-500' }
const BRAND = '#ae491e'
const BRAND_LT = '#f9ece6'
const BRAND_MID = '#e8c4b0'

const SECTIONS = [
  { key: 'section_business',    label: '1. Business-Level KPIs' },
  { key: 'section_team',        label: '2. Team-Level KPIs' },
  { key: 'section_marketing',   label: '3. Marketing Lead' },
  { key: 'section_cs',          label: '4. Client Services Lead' },
  { key: 'section_recruitment', label: '5. Recruitment Lead' },
  { key: 'section_training',    label: '6. Lead Trainer' },
  { key: 'section_office',      label: '7. Office Assistant' },
]

function PageShell({ title, children, page }: { title: string; children: React.ReactNode; page: number }) {
  return (
    <div className="bg-white shadow-md print:shadow-none" style={{ width: '210mm', minHeight: '297mm', padding: '14mm', position: 'relative', pageBreakAfter: 'always', margin: '0 auto 8mm', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div className="flex justify-between items-center pb-1 mb-5" style={{ borderBottom: `2.5px solid ${BRAND}` }}>
        <span style={{ fontSize: '11pt', fontWeight: 800, color: BRAND, letterSpacing: '.12em' }}>NESTARA</span>
        <span className="text-xs text-gray-400 font-mono">{title}</span>
      </div>
      {children}
      <div className="absolute bottom-6 left-14 right-14 flex justify-between text-xs text-gray-400 font-mono" style={{ borderTop: `1px solid ${BRAND_MID}`, paddingTop: 4 }}>
        <span>Internal Use Only</span><span>Page {page}</span>
      </div>
    </div>
  )
}

function KPITable({ rows, notes }: { rows: KPIRow[]; notes?: string }) {
  return (
    <div className="mb-4">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr style={{ background: BRAND, color: '#fff' }}>
            <th className="text-left px-3 py-2 w-[32%]">KPI</th>
            <th className="text-left px-3 py-2 w-[22%]">Target</th>
            <th className="text-left px-3 py-2 w-[14%]">Actual</th>
            <th className="text-left px-3 py-2 w-[24%]">Comments</th>
            <th className="text-center px-3 py-2 w-[8%]">RAG</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : BRAND_LT }}>
              <td className="px-3 py-2 font-medium text-gray-800 border border-gray-200">{row.kpi}</td>
              <td className="px-3 py-2 text-gray-500 font-mono border border-gray-200 text-xs">{row.target}</td>
              <td className="px-3 py-2 border border-gray-200">{row.actual || '—'}</td>
              <td className="px-3 py-2 text-gray-600 border border-gray-200">{row.comment}</td>
              <td className="px-3 py-2 border border-gray-200 text-center">
                {row.rag ? <span className={`w-3 h-3 rounded-full inline-block ${RAG_DOT[row.rag]}`} /> : <span className="text-gray-300">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {notes && <div className="mt-2 p-3 rounded text-xs text-gray-700" style={{ border: `1px solid ${BRAND_MID}`, background: BRAND_LT }}>{notes}</div>}
    </div>
  )
}

function SectionBar({ label }: { label: string }) {
  return <div className="text-xs font-bold text-white px-3 py-1.5 rounded-t uppercase tracking-wide" style={{ background: BRAND }}>{label}</div>
}

function StatCard({ label, value, accent, lost, won }: { label: string; value: string; accent?: boolean; lost?: boolean; won?: boolean }) {
  const bg = accent ? BRAND : won ? '#eef7f1' : lost ? '#fdf0f0' : BRAND_LT
  const border = accent ? BRAND : won ? '#6aaa7e' : lost ? '#d97b7b' : BRAND_MID
  const valColor = accent ? '#fff' : won ? '#6aaa7e' : lost ? '#d97b7b' : BRAND
  return (
    <div className="rounded-lg p-3 text-center flex-1" style={{ background: bg, border: `1.5px solid ${border}` }}>
      <p className="text-xs font-medium mb-1" style={{ color: accent ? 'rgba(255,255,255,0.8)' : '#6b6053' }}>{label}</p>
      <p className="text-xl font-bold" style={{ color: valColor }}>{value || '—'}</p>
    </div>
  )
}

function ReasonCard({ label, value, desc }: { label: string; value: string; desc?: string }) {
  return (
    <div className="flex-1 rounded-lg p-3 text-center" style={{ border: '1.5px solid #d97b7b', background: '#fdf0f0' }}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#d97b7b' }}>{label}</p>
      <p className="text-xl font-bold" style={{ color: '#d97b7b' }}>{value || '—'}</p>
      {desc && <p className="text-xs mt-1" style={{ color: '#6b6053' }}>{desc}</p>}
    </div>
  )
}

function SocialCard({ label, value, note, up }: { label: string; value: string; note?: string; up?: boolean }) {
  return (
    <div className="flex-1 rounded p-2 text-center" style={{ background: BRAND_LT, border: `1px solid ${BRAND_MID}` }}>
      <p className="font-semibold" style={{ fontSize: '5pt', color: '#6b6053', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</p>
      <p className="font-bold my-0.5" style={{ fontSize: '11pt', color: BRAND }}>{value || '—'}</p>
      {note && <p className={`text-xs`} style={{ fontSize: '4.5pt', color: up === true ? '#6aaa7e' : up === false ? '#d97b7b' : '#6b6053' }}>{note}</p>}
    </div>
  )
}

export function KPIReportView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const exportPDF = async () => {
    if (!report) return
    setExporting(true)
    try {
      // Check if running locally
      const isLocal = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' || 
                     window.location.hostname.includes('192.168') ||
                     window.location.port !== ''
      
      const apiEndpoint = isLocal ? 'http://localhost:3001/generate-pdf' : '/api/generate-pdf'
      const baseUrl = isLocal ? 'http://localhost:3000' : window.location.origin
      
      const url = `${baseUrl}/kpi-report/${id}`
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url, 
          filename: `${report.title}.pdf`,
          options: {
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
          }
        })
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${report.title}.pdf`
      link.click()
    } catch {
      alert('PDF generation failed. Please try again.')
    }
    setExporting(false)
  }

  useEffect(() => {
    supabase.from('kpi_reports').select('*').eq('id', id).single()
      .then(({ data }) => { if (data) setReport(data); setLoading(false) })
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#ae491e]"></div></div>
  if (!report) return <div className="p-6 text-gray-500">Report not found.</div>

  const a = report.analytics || {}
  const hdr = `Monthly KPI Report · ${report.title}`

  return (
    <div className="min-h-screen py-8 px-4 print:bg-white print:p-0" style={{ background: '#e8ddd5', fontFamily: "'Poppins', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap'); @media print { @page { size: A4; margin: 0; } }`}</style>

      <div style={{ width: '210mm', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }} className="print:hidden">
        <button onClick={() => navigate('/kpi-report')} className="text-sm text-gray-500 hover:text-gray-700">← All Reports</button>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate(`/kpi-report/${id}/fill`)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer' }}>
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={exportPDF} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '14px', background: BRAND, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: exporting ? 0.6 : 1 }}>
            <Printer className="w-3.5 h-3.5" /> {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      <div style={{ width: '210mm', margin: '0 auto' }}>

        {/* PAGE 1 — COVER */}
        <div className="bg-white shadow-md print:shadow-none" style={{ width: '210mm', minHeight: '297mm', padding: '14mm', position: 'relative', pageBreakAfter: 'always', margin: '0 auto 8mm', boxSizing: 'border-box', overflow: 'hidden', fontFamily: "'Poppins', sans-serif" }}>
          <div style={{ height: '14mm', background: BRAND, margin: '-14mm -14mm 0' }} />
          <div className="text-center" style={{ paddingTop: '36mm' }}>
            <h1 style={{ fontSize: '44pt', fontWeight: 900, color: BRAND, letterSpacing: '.08em', lineHeight: 1 }}>NESTARA</h1>
            <p style={{ fontSize: '13pt', fontWeight: 300, color: '#1a1201', marginTop: 5 }}>Monthly KPI Performance Report</p>
            <div style={{ marginTop: '12mm' }}>
              <span style={{ fontSize: '12pt', fontWeight: 600, color: BRAND, borderBottom: `2.5px solid ${BRAND}`, paddingBottom: 3 }}>{report.title}</span>
              <span style={{ fontSize: '12pt', fontWeight: 600, color: '#1a1201', marginLeft: 8 }}>Report</span>
            </div>
          </div>
          <p className="absolute text-center text-xs italic text-gray-400" style={{ bottom: '10mm', left: 0, right: 0 }}>Internal Use Only</p>
        </div>

        {/* PAGE 2 — EXECUTIVE SUMMARY */}
        {report.highlights && (
          <PageShell title={hdr} page={2}>
            <h2 className="font-bold mb-3" style={{ fontSize: '12pt', color: BRAND }}>1. Executive Summary</h2>
            <div className="p-4 rounded text-sm text-gray-800 leading-relaxed" style={{ border: `1.5px solid ${BRAND}`, background: BRAND_LT }}>
              <p className="font-bold mb-2" style={{ color: BRAND }}>Monthly Highlights</p>
              {report.highlights}
            </div>
          </PageShell>
        )}

        {/* PAGES 3–9 — KPI SECTIONS */}
        {SECTIONS.map(({ key, label }, idx) => {
          const rows = (report as any)[key] as KPIRow[]
          const notes = a[`notes_${key.replace('section_', '')}`]
          if (!rows?.length) return null
          return (
            <PageShell key={key} title={hdr} page={idx + 3}>
              <h2 className="font-bold mb-3" style={{ fontSize: '12pt', color: BRAND }}>{label}</h2>
              <KPITable rows={rows} notes={notes} />
            </PageShell>
          )
        })}

        {/* PAGE — BUSINESS CORE */}
        <PageShell title={hdr} page={10}>
          <p className="font-extrabold mb-4" style={{ fontSize: '13pt', color: BRAND, letterSpacing: '.04em' }}>Business Core</p>

          {/* Staff Placement Breakdown */}
          <SectionBar label="Staff Placement Breakdown" />
          <div className="flex gap-2 p-3 mb-3" style={{ border: `1.5px solid ${BRAND_MID}`, borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
            <StatCard label="Full-Time House Managers" value={a.placement_hm || '—'} />
            <StatCard label="Full-Time Housekeepers" value={a.placement_hk || '—'} />
            <StatCard label="Full-Time Executive Nannies" value={a.placement_nanny || '—'} />
            <StatCard label="Part-Time House Manager" value={a.placement_pt || '—'} />
            <StatCard label="Medical Caregiver" value={a.placement_medical || '—'} />
            <StatCard label="Total Placements" value={a.total_placements || '—'} won />
          </div>

          {/* Candidate Pipeline */}
          <SectionBar label="Candidate Pipeline" />
          <div className="flex items-center gap-1 p-3 mb-3" style={{ border: `1.5px solid ${BRAND_MID}`, borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
            <StatCard label="Total Inquiries" value={a.total_inquiries} />
            <span className="text-2xl font-light" style={{ color: BRAND_MID }}>›</span>
            <StatCard label="Joined Training" value={a.joined_training} />
            <span className="text-2xl font-light" style={{ color: BRAND_MID }}>›</span>
            <StatCard label="Graduated" value={a.graduated} won />
            <span className="text-2xl font-light" style={{ color: BRAND_MID }}>›</span>
            <StatCard label="Expelled / Dropped" value={a.expelled_dropped || '0'} lost />
            <span className="text-2xl font-light" style={{ color: BRAND_MID }}>›</span>
            <StatCard label="Placed in Roles" value={a.placed} won />
            <span className="text-2xl font-light" style={{ color: BRAND_MID }}>›</span>
            <StatCard label="Lost / Inactive" value={a.lost_inactive || '0'} lost />
          </div>

          {/* Client Pipeline */}
          <SectionBar label="Client Pipeline" />
          <div className="flex items-center gap-1 p-3 mb-3" style={{ border: `1.5px solid ${BRAND_MID}`, borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
            <StatCard label="Total Leads" value={a.client_leads} />
            <span className="text-2xl font-light" style={{ color: BRAND_MID }}>›</span>
            <StatCard label="Converted Clients" value={a.converted_clients} won />
            <span className="text-2xl font-light" style={{ color: BRAND_MID }}>›</span>
            <StatCard label="Lost Leads" value={a.lost_leads} lost />
          </div>

          {/* Reason for Lost Candidates */}
          <SectionBar label="Reason for Lost Candidates" />
          <div className="flex gap-2 p-3 mb-3" style={{ border: `1.5px solid ${BRAND_MID}`, borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
            <ReasonCard label="Lack of Experience" value={a.lost_experience || '—'} desc="High frequency reason" />
            <ReasonCard label="Could Not Afford Training" value={a.lost_afford || '—'} desc="Financial barrier" />
            <ReasonCard label="No Good Conduct Cert" value={a.lost_conduct || '—'} desc="Documentation gap" />
            <ReasonCard label="Missed Interview" value={a.lost_missed || '—'} desc="Did not show up" />
            <ReasonCard label="Age Limitations" value={a.lost_age || '—'} desc="Outside age criteria" />
            <ReasonCard label="Personality Concerns" value={a.lost_personality || '—'} desc="Attitude / fit issues" />
          </div>

          {/* Reason for Lost Clients */}
          <SectionBar label="Reason for Lost Clients" />
          <div className="flex gap-2 p-3 mb-3" style={{ border: `1.5px solid ${BRAND_MID}`, borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
            <ReasonCard label="Did Not Wish to Continue" value={a.client_lost_continue || '—'} desc="After initial contact" />
            <ReasonCard label="Ethics Misalignment" value={a.client_lost_ethics || '—'} desc="Not aligned with company code" />
            <ReasonCard label="Financial Constraints" value={a.client_lost_financial || '—'} desc="Could not afford service" />
            <ReasonCard label="Unreachable After Form" value={a.client_lost_unreachable || '—'} desc="No response post-enquiry" />
          </div>

          {/* Marketing Spend */}
          <SectionBar label="Marketing Spend & Attribution" />
          <div className="flex gap-3 p-3 mb-3" style={{ border: `1.5px solid ${BRAND_MID}`, borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
            <div className="flex flex-col items-center justify-center rounded-lg p-3 text-center" style={{ minWidth: 90, border: `1.5px solid #d4a843`, background: '#fff8e6' }}>
              <p className="text-xs font-semibold uppercase" style={{ color: '#6b6053' }}>Total Spend</p>
              <p className="text-lg font-bold" style={{ color: '#d4a843' }}>{a.marketing_spend ? `KES ${Number(a.marketing_spend).toLocaleString()}` : '—'}</p>
            </div>
            <div className="flex-1 rounded-lg overflow-hidden" style={{ border: `1.5px solid ${BRAND_MID}` }}>
              <div className="px-3 py-1.5 text-xs font-bold uppercase" style={{ background: '#f5e8e1', color: BRAND }}>NICHE Account — Candidate Recruitment</div>
              <div className="flex gap-2 p-2">
                <SocialCard label="Spend" value={a.niche_spend ? `KES ${Number(a.niche_spend).toLocaleString()}` : '—'} />
                <SocialCard label="Won Candidates" value={a.niche_won_candidates || '—'} />
              </div>
            </div>
            <div className="flex-1 rounded-lg overflow-hidden" style={{ border: `1.5px solid ${BRAND_MID}` }}>
              <div className="px-3 py-1.5 text-xs font-bold uppercase" style={{ background: '#f5e8e1', color: BRAND }}>Nestara Account — Client Side</div>
              <div className="flex gap-2 p-2">
                <SocialCard label="Spend" value={a.nestara_spend ? `KES ${Number(a.nestara_spend).toLocaleString()}` : '—'} />
                <SocialCard label="Google Spend" value={a.google_spend ? `KES ${Number(a.google_spend).toLocaleString()}` : '—'} />
                <SocialCard label="Won Clients" value={a.nestara_won_clients || '—'} />
              </div>
            </div>
            <div className="rounded-lg overflow-hidden" style={{ border: `1.5px solid ${BRAND_MID}`, minWidth: 100 }}>
              <div className="px-3 py-1.5 text-xs font-bold uppercase" style={{ background: '#f5e8e1', color: BRAND }}>Videography & Graphics</div>
              <div className="flex flex-col gap-1 p-2">
                <SocialCard label="Spend" value={a.creative_spend ? `KES ${Number(a.creative_spend).toLocaleString()}` : '—'} />
              </div>
            </div>
          </div>

          {/* Won per Channel */}
          <SectionBar label="Won per Channel" />
          <div className="flex gap-2 p-3" style={{ border: `1.5px solid ${BRAND_MID}`, borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
            <StatCard label="Won Clients — Instagram" value={a.won_instagram || '—'} won />
            <StatCard label="Won Clients — TikTok" value={a.won_tiktok || '—'} won />
            <StatCard label="Won Clients — Google" value={a.won_google || '—'} won />
            <StatCard label="Won Clients — Referral" value={a.won_referral || '—'} />
            <StatCard label="Won Clients — Other" value={a.won_other || '—'} />
          </div>
        </PageShell>

        {/* PAGE 11 — ANALYTICS DASHBOARD: Feb vs Current month comparison */}
        <PageShell title={hdr} page={11}>
          <p className="font-extrabold mb-4" style={{ fontSize: '13pt', color: BRAND }}>Analytics Dashboard</p>

          {/* Revenue Trend */}
          <SectionBar label={`Revenue Trend — Previous Month vs ${report.title}`} />
          <div className="p-4 mb-4" style={{ border: `1.5px solid ${BRAND_MID}`, borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#6b6053' }}>Placement Revenue</p>
                <div className="flex gap-2">
                  <div className="flex-1 rounded p-3 text-center" style={{ background: '#f5e8e1', border: `1px solid ${BRAND_MID}` }}>
                    <p className="text-xs" style={{ color: '#6b6053' }}>Previous Month</p>
                    <p className="text-lg font-bold" style={{ color: '#c4855a' }}>{a.prev_revenue_placement ? `KES ${Number(a.prev_revenue_placement).toLocaleString()}` : '—'}</p>
                  </div>
                  <div className="flex-1 rounded p-3 text-center" style={{ background: BRAND_LT, border: `1.5px solid ${BRAND}` }}>
                    <p className="text-xs" style={{ color: BRAND }}>{report.title}</p>
                    <p className="text-lg font-bold" style={{ color: BRAND }}>{a.revenue_placement ? `KES ${Number(a.revenue_placement).toLocaleString()}` : '—'}</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#6b6053' }}>Training Revenue</p>
                <div className="flex gap-2">
                  <div className="flex-1 rounded p-3 text-center" style={{ background: '#f5e8e1', border: `1px solid ${BRAND_MID}` }}>
                    <p className="text-xs" style={{ color: '#6b6053' }}>Previous Month</p>
                    <p className="text-lg font-bold" style={{ color: '#c4855a' }}>{a.prev_revenue_training ? `KES ${Number(a.prev_revenue_training).toLocaleString()}` : '—'}</p>
                  </div>
                  <div className="flex-1 rounded p-3 text-center" style={{ background: BRAND_LT, border: `1.5px solid ${BRAND}` }}>
                    <p className="text-xs" style={{ color: BRAND }}>{report.title}</p>
                    <p className="text-lg font-bold" style={{ color: BRAND }}>{a.revenue_training ? `KES ${Number(a.revenue_training).toLocaleString()}` : '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Candidate Funnel Comparison */}
          <SectionBar label="Candidate Success Funnel — Previous Month vs Current" />
          <div className="p-4 mb-4" style={{ border: `1.5px solid ${BRAND_MID}`, borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
            <div className="grid grid-cols-4 gap-3 mb-3">
              {[
                { label: 'Total Inquiries',  prev: a.prev_total_inquiries,  curr: a.total_inquiries },
                { label: 'Joined Training',  prev: a.prev_joined_training,  curr: a.joined_training },
                { label: 'Graduated',        prev: a.prev_graduated,        curr: a.graduated },
                { label: 'Placed in Roles',  prev: a.prev_placed,           curr: a.placed },
              ].map(({ label, prev, curr }) => (
                <div key={label} className="rounded p-3 text-center" style={{ border: `1.5px solid ${BRAND_MID}`, background: '#fff' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#6b6053' }}>{label}</p>
                  <div className="flex gap-1 justify-center">
                    <div className="flex-1 rounded py-1" style={{ background: '#f5e8e1' }}>
                      <p style={{ fontSize: '6pt', color: '#6b6053' }}>Prev</p>
                      <p className="font-bold text-sm" style={{ color: '#c4855a' }}>{prev || '—'}</p>
                    </div>
                    <div className="flex-1 rounded py-1" style={{ background: BRAND_LT }}>
                      <p style={{ fontSize: '6pt', color: BRAND }}>Now</p>
                      <p className="font-bold text-sm" style={{ color: BRAND }}>{curr || '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Conversion rates */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Inquiry → Training', prev: a.prev_inquiry_to_training_pct, curr: a.inquiry_to_training_pct },
                { label: 'Enrolled → Graduated', prev: a.prev_enrolled_to_grad_pct, curr: a.enrolled_to_grad_pct },
                { label: 'Graduated → Placed', prev: a.prev_grad_to_placed_pct, curr: a.grad_to_placed_pct },
              ].map(({ label, prev, curr }) => (
                <div key={label} className="rounded p-3 text-center" style={{ border: `1.5px solid ${BRAND_MID}`, background: BRAND_LT }}>
                  <p style={{ fontSize: '6pt', fontWeight: 600, color: '#6b6053', textTransform: 'uppercase' }}>{label}</p>
                  <p className="font-bold text-sm mt-1" style={{ color: '#6b6053' }}>Prev: {prev || '—'}</p>
                  <p className="font-bold text-sm" style={{ color: BRAND }}>Now: {curr || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Inquiry to Placement Success Rate */}
          <SectionBar label="Inquiry to Placement Success Rate" />
          <div className="flex gap-4 p-4" style={{ border: `1.5px solid ${BRAND_MID}`, borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
            <div className="flex-1 rounded p-4 text-center" style={{ background: BRAND_LT, border: `1.5px solid ${BRAND_MID}` }}>
              <p style={{ fontSize: '6pt', fontWeight: 700, color: '#6b6053', textTransform: 'uppercase' }}>Previous Month</p>
              <p className="font-extrabold mt-1" style={{ fontSize: '22pt', color: '#c4855a', lineHeight: 1.1 }}>{a.prev_success_rate || '—'}</p>
              <p style={{ fontSize: '6pt', color: '#6b6053', marginTop: 2 }}>{a.prev_placed || '—'} placed from {a.prev_total_inquiries || '—'} inquiries</p>
            </div>
            <div className="flex-1 rounded p-4 text-center" style={{ background: BRAND_LT, border: `1.5px solid ${BRAND}` }}>
              <p style={{ fontSize: '6pt', fontWeight: 700, color: BRAND, textTransform: 'uppercase' }}>{report.title}</p>
              <p className="font-extrabold mt-1" style={{ fontSize: '22pt', color: BRAND, lineHeight: 1.1 }}>{a.success_rate || '—'}</p>
              <p style={{ fontSize: '6pt', color: '#6b6053', marginTop: 2 }}>{a.placed || '—'} placed from {a.total_inquiries || '—'} inquiries</p>
            </div>
            <div className="flex-1 rounded p-4 text-center" style={{ background: BRAND, border: `1.5px solid ${BRAND}` }}>
              <p style={{ fontSize: '6pt', fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>Combined</p>
              <p className="font-extrabold mt-1" style={{ fontSize: '22pt', color: '#fff', lineHeight: 1.1 }}>{a.combined_success_rate || '—'}</p>
              <p style={{ fontSize: '6pt', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{a.combined_placed || '—'} placed from {a.combined_inquiries || '—'} total</p>
            </div>
          </div>

          {/* Key Highlights */}
          {(a.highlight_placements || a.highlight_training || a.highlight_revenue || a.highlight_conversion || a.highlight_training_revenue) && (
            <>
              <p className="text-xs font-bold uppercase mt-4 mb-2" style={{ color: BRAND, letterSpacing: '.05em' }}>Key Highlights — Previous Month vs {report.title}</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'highlight_placements', label: 'Placements' },
                  { key: 'highlight_training', label: 'Training' },
                  { key: 'highlight_revenue', label: 'Revenue' },
                  { key: 'highlight_conversion', label: 'Client Conversion' },
                  { key: 'highlight_training_revenue', label: 'Training Revenue' },
                ].filter(h => a[h.key]).map(({ key, label }) => (
                  <div key={key} className="rounded p-3" style={{ background: BRAND_LT, border: `1.5px solid ${BRAND_MID}` }}>
                    <p style={{ fontSize: '5.5pt', fontWeight: 700, color: BRAND, textTransform: 'uppercase', marginBottom: 2 }}>{label}</p>
                    <p style={{ fontSize: '7pt', color: '#1a1201', lineHeight: 1.5 }}>{a[key]}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </PageShell>

      </div>
    </div>
  )
}
