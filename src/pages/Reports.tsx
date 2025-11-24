import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Download, Calendar, FileText, Printer, Eye, Trash2, Plus } from 'lucide-react'

interface Report {
  id: string
  title: string
  date_from: string
  date_to: string
  created_at: string
  content: string
}

interface Client {
  id: string
  status: string
  source: string
  want_to_hire: string
  created_at: string
  placement_fee?: number
  placement_status?: string
}

interface Candidate {
  id: string
  status: string
  source: string
  role: string
  created_at: string
}

export function Reports() {
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<Report[]>([])
  const [viewingReport, setViewingReport] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [clients, setClients] = useState<Client[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])

  useEffect(() => {
    loadReports()
    loadData()
  }, [])

  useEffect(() => {
    loadData()
  }, [dateRange])

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setReports(data || [])
    } catch (error) {
      console.error('Error loading reports:', error)
    }
  }

  const loadData = async () => {
    try {
      let clientQuery = supabase.from('clients').select('*')
      let candidateQuery = supabase.from('candidates').select('*')

      if (dateRange.start && dateRange.end) {
        clientQuery = clientQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end + 'T23:59:59Z') as any
        candidateQuery = candidateQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end + 'T23:59:59Z') as any
      }

      const [{ data: clientData, error: clientErr }, { data: candidateData, error: candidateErr }] = await Promise.all([
        clientQuery,
        candidateQuery,
      ])
      
      if (clientErr) throw clientErr
      if (candidateErr) throw candidateErr

      setClients(clientData || [])
      setCandidates(candidateData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => num.toLocaleString()

  const getDateRangeText = () => {
    if (dateRange.start && dateRange.end) {
      return `${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}`
    }
    return 'All Time'
  }

  const getBusinessMetrics = () => {
    const totalClients = clients.length
    const totalCandidates = candidates.length
    const wonClients = clients.filter(c => c.status === 'Won').length
    const wonCandidates = candidates.filter(c => c.status === 'WON').length
    const clientWinRate = totalClients > 0 ? ((wonClients / totalClients) * 100).toFixed(1) : '0'
    const candidateWinRate = totalCandidates > 0 ? ((wonCandidates / totalCandidates) * 100).toFixed(1) : '0'

    return { totalClients, totalCandidates, wonClients, wonCandidates, clientWinRate, candidateWinRate }
  }

  const getClientStatusBreakdown = () => {
    const statusCounts = clients.reduce((acc, client) => {
      let status = client.status
      if (status.startsWith('Client -')) status = 'Active'
      if (status.startsWith('Lost') || status === 'Budget' || status === 'Ghosted' || status === 'Competition') status = 'Lost'
      if (status.startsWith('Pending')) status = 'Pending'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return statusCounts
  }

  const getSourcePerformance = () => {
    const sources = ['Facebook', 'Instagram', 'Google Search', 'Website', 'Referral', 'Walk-in poster', 'TikTok', 'LinkedIn', 'Youtube']
    
    return sources.map(source => {
      const sourceClients = clients.filter(c => (c.source || 'Other') === source)
      const sourceCandidates = candidates.filter(c => (c.source || 'Other') === source)
      const wonClients = sourceClients.filter(c => c.status === 'Won').length
      const wonCandidates = sourceCandidates.filter(c => c.status === 'WON').length
      
      return {
        source,
        clientsTotal: sourceClients.length,
        candidatesTotal: sourceCandidates.length,
        clientsWon: wonClients,
        candidatesWon: wonCandidates,
        clientWinRate: sourceClients.length > 0 ? ((wonClients / sourceClients.length) * 100).toFixed(1) : '0'
      }
    }).filter(s => s.clientsTotal > 0 || s.candidatesTotal > 0)
  }

  const getRoleAnalysis = () => {
    const roleRequests = clients.reduce((acc, c) => {
      acc[c.want_to_hire] = (acc[c.want_to_hire] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const roleSupply = candidates.reduce((acc, c) => {
      acc[c.role] = (acc[c.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const roles = [...new Set([...Object.keys(roleRequests), ...Object.keys(roleSupply)])]
    
    return roles.map(role => ({
      role,
      demand: roleRequests[role] || 0,
      supply: roleSupply[role] || 0,
      ratio: (roleSupply[role] || 0) / (roleRequests[role] || 1)
    })).sort((a, b) => b.demand - a.demand)
  }

  const exportToPNG = () => {
    window.print()
  }

  const deleteReport = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return
    
    try {
      const { error } = await supabase.from('reports').delete().eq('id', id)
      if (error) throw error
      loadReports()
    } catch (error) {
      console.error('Error deleting report:', error)
    }
  }

  const generateReport = async () => {
    if (!dateRange.start || !dateRange.end) {
      alert('Please select both start and end dates')
      return
    }

    const title = `Business Progress Report from ${new Date(dateRange.start).toLocaleDateString()} to ${new Date(dateRange.end).toLocaleDateString()}`
    const content = getReportHTML()

    try {
      const { error } = await supabase.from('reports').insert({
        title,
        date_from: dateRange.start,
        date_to: dateRange.end,
        content
      })
      
      if (error) throw error
      loadReports()
      setDateRange({ start: '', end: '' })
    } catch (error) {
      console.error('Error saving report:', error)
    }
  }

  const getTemplateReport = () => {
    return {
      id: 'template',
      title: 'Business Progress Report from 15th Sep to 22nd Oct',
      date_from: '2025-09-15',
      date_to: '2025-10-22',
      created_at: '2025-10-25',
      content: getTemplateHTML()
    }
  }

  const getTemplateHTML = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nestara Progress Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @media print {
            body {
                margin: 0;
                padding: 0;
                width: 210mm;
                height: 297mm;
            }
            
            .page {
                page-break-after: always;
                page-break-inside: avoid;
                margin: 0;
                padding: 12mm 11mm;
                box-shadow: none;
                width: 210mm;
                height: 297mm;
                overflow: hidden;
            }
            
            .cover-page {
                page-break-after: always;
                page-break-inside: avoid;
                padding: 0;
                margin: 0;
                width: 210mm;
                height: 297mm;
            }
            
            .footer {
                position: absolute;
                bottom: 10mm;
            }
            
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.35;
        }

        .cover-page {
            width: 210mm;
            height: 297mm;
            margin: 0 auto 5mm auto;
            background: linear-gradient(135deg, #ae491e 0%, #8a3718 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 20mm;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            position: relative;
        }

        .cover-logo {
            font-size: 72px;
            font-weight: 700;
            color: white;
            letter-spacing: 2px;
            margin-bottom: 8mm;
        }

        .cover-title {
            font-size: 32px;
            font-weight: 700;
            color: white;
            text-align: center;
            margin-bottom: 4mm;
            line-height: 1.3;
        }

        .cover-subtitle {
            font-size: 18px;
            color: #fef8f6;
            text-align: center;
            margin-bottom: 2mm;
        }

        .cover-date {
            font-size: 16px;
            color: #fef8f6;
            text-align: center;
            margin-bottom: 15mm;
        }

        .cover-confidential {
            background: white;
            color: #ae491e;
            padding: 8px 24px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 15mm;
            letter-spacing: 1px;
        }

        .cover-team {
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid white;
            border-radius: 10px;
            padding: 15px 30px;
            margin-top: 10mm;
        }

        .cover-team-title {
            font-size: 14px;
            color: white;
            font-weight: 700;
            text-align: center;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .cover-team-member {
            font-size: 13px;
            color: white;
            text-align: center;
            margin: 6px 0;
            line-height: 1.4;
        }

        .cover-footer {
            position: absolute;
            bottom: 15mm;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.8);
            text-align: center;
        }

        .page {
            width: 210mm;
            min-height: 297mm;
            padding: 12mm 11mm;
            margin: 0 auto 5mm auto;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5mm;
            padding-bottom: 3mm;
            border-bottom: 3px solid #ae491e;
        }

        .logo {
            font-size: 28px;
            font-weight: 700;
            color: #ae491e;
            letter-spacing: 1px;
        }

        .date-badge {
            background: #ae491e;
            color: white;
            padding: 5px 14px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 600;
        }

        .footer {
            margin-top: 8mm;
            text-align: center;
            font-size: 8px;
            color: #999;
            padding-top: 3mm;
            border-top: 1px solid #e0e0e0;
        }

        .title-section {
            margin-bottom: 5mm;
        }

        .main-title {
            font-size: 24px;
            font-weight: 700;
            color: #ae491e;
            margin-bottom: 3px;
        }

        .subtitle {
            font-size: 12px;
            color: #666;
            font-weight: 400;
        }

        .section-header {
            background: linear-gradient(135deg, #ae491e 0%, #8a3718 100%);
            color: white;
            padding: 7px 14px;
            margin: 4mm 0 3mm 0;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 3mm;
            margin-bottom: 4mm;
        }

        .metric-card {
            background: linear-gradient(135deg, #fff 0%, #fef8f6 100%);
            border: 2px solid #ae491e;
            border-radius: 7px;
            padding: 10px;
            text-align: center;
        }

        .metric-value {
            font-size: 26px;
            font-weight: 700;
            color: #ae491e;
            margin-bottom: 3px;
        }

        .metric-label {
            font-size: 9px;
            color: #666;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        .two-col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3mm;
            margin-bottom: 4mm;
        }

        .card {
            background: #fafafa;
            border-radius: 7px;
            padding: 10px;
            border-left: 4px solid #ae491e;
        }

        .card-title {
            font-size: 12px;
            font-weight: 700;
            color: #ae491e;
            margin-bottom: 7px;
        }

        .stat-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #e0e0e0;
            font-size: 10px;
        }

        .stat-row:last-child {
            border-bottom: none;
        }

        .stat-label {
            color: #666;
            font-weight: 500;
        }

        .stat-value {
            font-weight: 700;
            color: #333;
        }

        .insight-box {
            background: #fff9f6;
            border: 1px solid #ae491e;
            border-radius: 7px;
            padding: 11px;
            margin-bottom: 4mm;
        }

        .insight-title {
            font-size: 11px;
            font-weight: 700;
            color: #ae491e;
            margin-bottom: 6px;
        }

        .insight-text {
            font-size: 10px;
            color: #555;
            line-height: 1.5;
        }

        .funnel {
            display: flex;
            flex-direction: column;
            gap: 3px;
            margin: 9px 0;
        }

        .funnel-stage {
            background: linear-gradient(to right, #ae491e, #d15a2a);
            color: white;
            padding: 8px 12px;
            border-radius: 5px;
            font-size: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 600;
        }

        .funnel-stage:nth-child(2) {
            width: 85%;
            margin-left: auto;
        }

        .funnel-stage:nth-child(3) {
            width: 70%;
            margin-left: auto;
        }

        .funnel-stage:nth-child(4) {
            width: 55%;
            margin-left: auto;
        }

        .table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
            margin: 7px 0;
        }

        .table th {
            background: #ae491e;
            color: white;
            padding: 5px;
            text-align: left;
            font-weight: 600;
        }

        .table td {
            padding: 5px;
            border-bottom: 1px solid #e0e0e0;
        }

        .table tr:hover {
            background: #fef8f6;
        }

        .badge {
            display: inline-block;
            padding: 3px 7px;
            border-radius: 10px;
            font-size: 8px;
            font-weight: 600;
        }

        .badge-danger {
            background: #f8d7da;
            color: #721c24;
        }

        .badge-warning {
            background: #fff3cd;
            color: #856404;
        }

        .progress-bar {
            background: #e0e0e0;
            height: 7px;
            border-radius: 4px;
            overflow: hidden;
            margin: 3px 0;
        }

        .progress-fill {
            background: #ae491e;
            height: 100%;
        }

        .highlight-number {
            font-size: 18px;
            font-weight: 700;
            color: #ae491e;
        }

        .three-col {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 3mm;
            margin-bottom: 4mm;
        }

        .small-card {
            background: white;
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 10px;
            text-align: center;
        }

        .four-col {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 2.5mm;
            margin-bottom: 4mm;
        }

        .status-card {
            background: white;
            border: 2px solid #ddd;
            border-radius: 6px;
            padding: 8px;
            text-align: center;
        }

        .status-number {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 3px;
        }

        .status-label {
            font-size: 9px;
            color: #666;
            font-weight: 600;
            text-transform: uppercase;
        }
    </style>
</head>
<body>`

  const getReportHTML = () => {
    const metrics = getBusinessMetrics()
    const statusBreakdown = getClientStatusBreakdown()
    const sourcePerformance = getSourcePerformance()
    
    return `<!DOCTYPE html>
<html><head><title>Business Report</title></head><body>
<h1>Business Progress Report</h1>
<p>Period: ${getDateRangeText()}</p>
<h2>Metrics</h2>
<p>Total Clients: ${metrics.totalClients}</p>
<p>Total Candidates: ${metrics.totalCandidates}</p>
<p>Client Win Rate: ${metrics.clientWinRate}%</p>
<p>Candidate Win Rate: ${metrics.candidateWinRate}%</p>
</body></html>`
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nestalk-primary"></div>
        </div>
      </div>
    )
  }

  const metrics = getBusinessMetrics()
  const statusBreakdown = getClientStatusBreakdown()
  const sourcePerformance = getSourcePerformance()
  const roleAnalysis = getRoleAnalysis()

  if (viewingReport) {
    const report = viewingReport === 'template' ? getTemplateReport() : reports.find(r => r.id === viewingReport)
    if (!report) return <div>Report not found</div>
    
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
            <p className="text-gray-600">{new Date(report.date_from).toLocaleDateString()} - {new Date(report.date_to).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportToPNG}
              className="flex items-center gap-2 px-4 py-2 bg-nestalk-primary text-white rounded hover:bg-nestalk-primary/90"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setViewingReport(null)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Back
            </button>
          </div>
        </div>
        <div dangerouslySetInnerHTML={{ __html: report.content }} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Business Reports</h1>
        <p className="text-gray-600">Generate and manage comprehensive business analytics reports</p>
      </div>

      {/* Generate New Report */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Generate New Report</h3>
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>

          <button
            onClick={generateReport}
            className="flex items-center gap-2 px-4 py-2 bg-nestalk-primary text-white rounded hover:bg-nestalk-primary/90"
          >
            <Plus className="w-4 h-4" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Template Report */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <FileText className="w-8 h-8 text-nestalk-primary" />
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">Template</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Business Progress Report from 15th Sep to 22nd Oct</h3>
          <p className="text-sm text-gray-600 mb-3">Sep 15, 2025 - Oct 22, 2025</p>
          <p className="text-xs text-gray-500 mb-4">Sample report template</p>
          <div className="flex gap-2">
            <button
              onClick={() => setViewingReport('template')}
              className="flex items-center gap-1 px-3 py-1 bg-nestalk-primary text-white rounded text-sm hover:bg-nestalk-primary/90"
            >
              <Eye className="w-3 h-3" />
              View
            </button>
          </div>
        </div>

        {/* Saved Reports */}
        {reports.map((report) => (
          <div key={report.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <FileText className="w-8 h-8 text-nestalk-primary" />
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">Saved</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{report.title}</h3>
            <p className="text-sm text-gray-600 mb-3">
              {new Date(report.date_from).toLocaleDateString()} - {new Date(report.date_to).toLocaleDateString()}
            </p>
            <p className="text-xs text-gray-500 mb-4">Created: {new Date(report.created_at).toLocaleDateString()}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setViewingReport(report.id)}
                className="flex items-center gap-1 px-3 py-1 bg-nestalk-primary text-white rounded text-sm hover:bg-nestalk-primary/90"
              >
                <Eye className="w-3 h-3" />
                View
              </button>
              <button
                onClick={() => deleteReport(report.id)}
                className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nestalk-primary"></div>
        </div>
      )}
    </div>
  )
}