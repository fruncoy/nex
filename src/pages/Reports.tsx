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
<body>
    <!-- COVER PAGE -->
    <div class="cover-page">
        <div class="cover-logo">Nestara</div>
        
        <div class="cover-title">Business Progress Report</div>
        
        <div class="cover-subtitle">Comprehensive Business Analytics</div>
        
        <div class="cover-date">September 15 - October 22, 2025</div>
        
        <div class="cover-team">
            <div class="cover-team-title">Prepared By</div>
            <div class="cover-team-member">Frank, Marketing Specialist</div>
            <div class="cover-team-member">Ivy, Client Specialist</div>
            <div class="cover-team-member">Purity, Recruitment Specialist</div>
        </div>
        
        <div class="cover-footer">
            Nestara Confidential Report | Internal Use Only
        </div>
    </div>

    <!-- PAGE 1: BUSINESS CORE -->
    <div class="page">
        <div class="header">
            <div class="logo">Nestara</div>
            <div class="date-badge">Generated: October 25, 2025</div>
        </div>

        <div class="title-section">
            <div class="main-title">Business Progress Report</div>
            <div class="subtitle">Comprehensive Analytics | September 15 - October 22, 2025</div>
        </div>

        <div class="section-header">BUSINESS CORE OVERVIEW</div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">39</div>
                <div class="metric-label">Total Clients</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">258</div>
                <div class="metric-label">Total Candidates</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">18.2%</div>
                <div class="metric-label">Candidate Win Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">10.3%</div>
                <div class="metric-label">Client Win Rate</div>
            </div>
        </div>

        <div class="insight-box">
            <div class="insight-title">Executive Summary</div>
            <div class="insight-text">
                Over the 40-day period (Sep 15 - Oct 22, 2025), Nestara demonstrated strong market presence with 39 client engagements and 258 candidate applications. The business achieved 4 successful client placements (10.3% win rate) and onboarded 47 qualified candidates (18.2% win rate) into the talent pool. With 11 active clients in communication (who paid KES 3,000 PAF) and 13 pending candidates, the pipeline remains healthy. Marketing investment of KES 32,000 generated strong performance with Google Ads achieving 100% lead conversion to paid PAF or won status. Key operational challenges include high candidate attrition rates (68.2% lost primarily due to lack of good conduct certificates) and client ghosting (13 clients), requiring enhanced engagement strategies.
            </div>
        </div>

        <div class="section-header">BUSINESS WINS & ACHIEVEMENTS</div>

        <div class="two-col">
            <div class="card">
                <div class="card-title">Successful Placements</div>
                <div class="stat-row">
                    <span class="stat-label">Part-Time Placements</span>
                    <span class="stat-value">2</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Angeline Nelima</span>
                    <span class="stat-value">Active</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Doreen Khayanga</span>
                    <span class="stat-value">Active</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Active Trial</span>
                    <span class="stat-value">1</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Evaline Adhiambo</span>
                    <span class="stat-value">On Trial</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Reliever Assignment</span>
                    <span class="stat-value">1</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Nelly (Client: Safiya)</span>
                    <span class="stat-value">Active</span>
                </div>
            </div>

            <div class="card">
                <div class="card-title">Reputation & Reviews</div>
                <div class="stat-row">
                    <span class="stat-label">Google Reviews</span>
                    <span class="stat-value">12</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Published Client Review</span>
                    <span class="stat-value">1</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Asim Shah</span>
                    <span class="stat-value">✓</span>
                </div>
                <div style="margin-top: 10px; padding: 7px; background: #f0f9ff; border-radius: 5px;">
                    <div style="font-size: 9px; color: #666; margin-bottom: 3px;">Review Velocity</div>
                    <div class="highlight-number">0.3 <span style="font-size: 11px; font-weight: normal;">reviews/day</span></div>
                </div>
            </div>
        </div>

        <div class="section-header">CHALLENGES & LEARNINGS</div>

        <div class="two-col">
            <div class="card">
                <div class="card-title">Failed Placements & Trials</div>
                <div class="stat-row">
                    <span class="stat-label">Failed Placement</span>
                    <span class="stat-value">1</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Euphemia</span>
                    <span class="badge badge-danger">Placement Failed</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Failed Trial</span>
                    <span class="stat-value">1</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Everline Wairimu</span>
                    <span class="badge badge-danger">BLACKLISTED</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Refunded Placement</span>
                    <span class="stat-value">1</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Rachael Njoki (KES 23,000)</span>
                    <span class="badge badge-warning">No Good Conduct</span>
                </div>
                <div style="margin-top: 8px; font-size: 9px; color: #d32f2f; font-weight: 600;">
                    Trial Success Rate: 0% (0/1)
                </div>
            </div>

            <div class="card">
                <div class="card-title">Client Pipeline Health</div>
                <div class="stat-row">
                    <span class="stat-label">Active Communication (Paid PAF)</span>
                    <span class="stat-value">11 clients</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Ghosted/Lost</span>
                    <span class="stat-value">13 clients</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Budget Constraints</span>
                    <span class="stat-value">4 clients</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Pending Actions</span>
                    <span class="stat-value">6 clients</span>
                </div>
            </div>
        </div>

        <div class="section-header">CLIENT CONVERSION FUNNEL</div>

        <div class="funnel">
            <div class="funnel-stage">
                <span>Total Client Inquiries</span>
                <span>39 (100%)</span>
            </div>
            <div class="funnel-stage">
                <span>Active + Communication Ongoing</span>
                <span>11 (28.2%)</span>
            </div>
            <div class="funnel-stage">
                <span>Won Clients</span>
                <span>4 (10.3%)</span>
            </div>
            <div class="funnel-stage">
                <span>Successful Placements</span>
                <span>2 (5.1%)</span>
            </div>
        </div>

        <div class="footer">
            Nestara Progress Report | Confidential Business Document | Page 1 of 4
        </div>
    </div>

    <!-- PAGE 2: CLIENT ANALYSIS -->
    <div class="page">
        <div class="header">
            <div class="logo">Nestara</div>
            <div class="date-badge">Sep 15 - Oct 22, 2025</div>
        </div>

        <div class="section-header">CLIENT ACQUISITION & PERFORMANCE ANALYSIS</div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">39</div>
                <div class="metric-label">Total Inquiries</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">4</div>
                <div class="metric-label">Won Clients</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">10.3%</div>
                <div class="metric-label">Conversion Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">11</div>
                <div class="metric-label">Active Pipeline (Paid PAF)</div>
            </div>
        </div>

        <div class="insight-box">
            <div class="insight-title">AI-Powered Client Insights</div>
            <div class="insight-text">
                Client acquisition shows strong channel diversification with Google Search (10 clients) and Instagram (11 clients) leading inquiries. Referrals demonstrate superior quality with 33.3% win rate (2 of 6 converted), significantly outperforming all channels. Google Ads achieved exceptional 100% conversion to paid PAF or won status (10 of 10), with 80% paying the KES 3,000 Profile Access Fee. The 33.3% ghosting rate (13 clients) after form submission indicates potential friction in early engagement stages. Budget constraints affected 10.3% of prospects. House Manager roles dominate demand (20 requests, 51.3%), followed by Housekeepers (11 requests, 28.2%). Active pipeline of 11 clients who paid PAF represents strong near-term revenue potential.
            </div>
        </div>

        <div class="section-header">CLIENT PIPELINE STATUS BREAKDOWN</div>

        <div class="four-col">
            <div class="status-card" style="border-color: #2e7d32;">
                <div class="status-number" style="color: #2e7d32;">4</div>
                <div class="status-label">Won</div>
                <div style="font-size: 8px; color: #999; margin-top: 2px;">10.3%</div>
            </div>
            <div class="status-card" style="border-color: #1565c0;">
                <div class="status-number" style="color: #1565c0;">11</div>
                <div class="status-label">Active (Paid PAF)</div>
                <div style="font-size: 8px; color: #999; margin-top: 2px;">28.2%</div>
            </div>
            <div class="status-card" style="border-color: #f57c00;">
                <div class="status-number" style="color: #f57c00;">6</div>
                <div class="status-label">Pending</div>
                <div style="font-size: 8px; color: #999; margin-top: 2px;">15.4%</div>
            </div>
            <div class="status-card" style="border-color: #c62828;">
                <div class="status-number" style="color: #c62828;">18</div>
                <div class="status-label">Lost/Cold</div>
                <div style="font-size: 8px; color: #999; margin-top: 2px;">46.2%</div>
            </div>
        </div>

        <div class="footer">
            Nestara Progress Report | Confidential Business Document | Page 2 of 4
        </div>
    </div>

    <!-- PAGE 3: CANDIDATES -->
    <div class="page">
        <div class="header">
            <div class="logo">Nestara</div>
            <div class="date-badge">Sep 15 - Oct 22, 2025</div>
        </div>

        <div class="section-header">CANDIDATES RECRUITMENT ANALYSIS</div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">47</div>
                <div class="metric-label">WON Candidates</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">30</div>
                <div class="metric-label">Interviews Conducted</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">96.7%</div>
                <div class="metric-label">Interview Success</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">23</div>
                <div class="metric-label">Complete Profiles</div>
            </div>
        </div>

        <div class="footer">
            Nestara Progress Report | Confidential Business Document | Page 3 of 4
        </div>
    </div>

    <!-- PAGE 4: MARKETING -->
    <div class="page">
        <div class="header">
            <div class="logo">Nestara</div>
            <div class="date-badge">Sep 15 - Oct 22, 2025</div>
        </div>

        <div class="section-header">MARKETING PERFORMANCE ANALYSIS</div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">32.0K</div>
                <div class="metric-label">Total Ad Spend (KES)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">1,500</div>
                <div class="metric-label">Cost Per Client Lead</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">250</div>
                <div class="metric-label">Cost Per WON Candidate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">100%</div>
                <div class="metric-label">Google Conversion</div>
            </div>
        </div>

        <div class="footer">
            Nestara Progress Report | Confidential Business Document | Page 4 of 4
        </div>
    </div>
</body>
</html>`
  }

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
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Reports</h1>
          <p className="text-gray-600">Generate and manage comprehensive business analytics reports</p>
        </div>
        <button
          onClick={generateReport}
          className="flex items-center gap-2 px-4 py-2 bg-nestalk-primary text-white rounded hover:bg-nestalk-primary/90"
        >
          <Plus className="w-4 h-4" />
          Generate Report
        </button>
      </div>



      {/* Reports List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Business Progress Report */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <FileText className="w-8 h-8 text-nestalk-primary" />
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">Report</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Business Progress Report from 15th Sep to 22nd Oct</h3>
          <p className="text-sm text-gray-600 mb-3">Sep 15, 2025 - Oct 22, 2025</p>
          <p className="text-xs text-gray-500 mb-4">Comprehensive business analytics report</p>
          <div className="flex gap-2">
            <button
              onClick={() => setViewingReport('template')}
              className="flex items-center gap-1 px-3 py-1 bg-nestalk-primary text-white rounded text-sm hover:bg-nestalk-primary/90"
            >
              <Eye className="w-3 h-3" />
              View Report
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