import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Download, Calendar, FileText, Printer, Eye, Trash2, Plus } from 'lucide-react'
import { geminiService, type BusinessData } from '../services/geminiService'

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
  role_requested: string
  created_at: string
  name_company: string
  contact_info: string
}

interface Candidate {
  id: string
  status: string
  source: string
  role: string
  created_at: string
  name: string
  phone: string
}

interface Interview {
  id: string
  candidate_id: string
  attended: boolean
  outcome: string
  created_at: string
}

interface TrainingLead {
  id: string
  status: string
  training_type: string
  created_at: string
}

export function Reports() {
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<Report[]>([])
  const [viewingReport, setViewingReport] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [clients, setClients] = useState<Client[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [trainingLeads, setTrainingLeads] = useState<TrainingLead[]>([])
  const [executiveSummary, setExecutiveSummary] = useState<string>('')
  const [clientInsights, setClientInsights] = useState<string>('')
  const [candidateInsights, setCandidateInsights] = useState<string>('')
  const [generatingInsights, setGeneratingInsights] = useState(false)

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
      let interviewQuery = supabase.from('interviews').select('*')
      let trainingQuery = supabase.from('training_leads').select('*')

      if (dateRange.start && dateRange.end) {
        const startDate = dateRange.start
        const endDate = dateRange.end + 'T23:59:59Z'
        clientQuery = clientQuery.gte('created_at', startDate).lte('created_at', endDate) as any
        candidateQuery = candidateQuery.gte('created_at', startDate).lte('created_at', endDate) as any
        interviewQuery = interviewQuery.gte('created_at', startDate).lte('created_at', endDate) as any
        trainingQuery = trainingQuery.gte('created_at', startDate).lte('created_at', endDate) as any
      }

      const [
        { data: clientData, error: clientErr },
        { data: candidateData, error: candidateErr },
        { data: interviewData, error: interviewErr },
        { data: trainingData, error: trainingErr }
      ] = await Promise.all([
        clientQuery,
        candidateQuery,
        interviewQuery,
        trainingQuery
      ])
      
      if (clientErr) throw clientErr
      if (candidateErr) throw candidateErr
      if (interviewErr) throw interviewErr
      if (trainingErr) throw trainingErr

      setClients(clientData || [])
      setCandidates(candidateData || [])
      setInterviews(interviewData || [])
      setTrainingLeads(trainingData || [])

      // Generate AI insights if we have a date range
      if (dateRange.start && dateRange.end) {
        await generateInsights({
          clients: clientData || [],
          candidates: candidateData || [],
          interviews: interviewData || [],
          trainingLeads: trainingData || [],
          dateRange
        })
      }
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
      acc[c.role_requested] = (acc[c.role_requested] || 0) + 1
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

  const generateInsights = async (data: BusinessData) => {
    setGeneratingInsights(true)
    try {
      const [execSummary, clientAnalysis, candidateAnalysis] = await Promise.all([
        geminiService.generateExecutiveSummary(data),
        geminiService.generateClientAnalysis(data),
        geminiService.generateCandidateAnalysis(data)
      ])
      
      setExecutiveSummary(execSummary)
      setClientInsights(clientAnalysis)
      setCandidateInsights(candidateAnalysis)
    } catch (error) {
      console.error('Error generating insights:', error)
    } finally {
      setGeneratingInsights(false)
    }
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
      title: 'Business Progress Report - October 2025',
      date_from: '2025-10-01',
      date_to: '2025-10-31',
      created_at: new Date().toISOString(),
      content: getOctoberReportHTML()
    }
  }



  const getTemplateHTML = () => {
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const reportPeriod = getDateRangeText()
    
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
        
        <div class="cover-date" id="report-period">October 1 - 31, 2025</div>
        

        
        <div class="cover-footer">
            Nestara Confidential Report | Internal Use Only
        </div>
    </div>

    <!-- PAGE 1: BUSINESS CORE -->
    <div class="page">
        <div class="header">
            <div class="logo">Nestara</div>
            <div class="date-badge" id="generated-date">Generated: October 25, 2025</div>
        </div>

        <div class="title-section">
            <div class="main-title">Business Progress Report</div>
            <div class="subtitle">Comprehensive Analytics | October 1 - 31, 2025</div>
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
            <div class="insight-text" id="executive-summary">
                Loading AI-powered insights...
            </div>
        </div>

        <div class="section-header">BUSINESS WINS & ACHIEVEMENTS</div>

        <div class="two-col">
            <div class="card">
                <div class="card-title">Successful Placements</div>
                <div class="stat-row">
                    <span class="stat-label">Won Clients</span>
                    <span class="stat-value" id="won-placements">${wonClients}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Active Trials</span>
                    <span class="stat-value" id="active-trials">0</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Completed Interviews</span>
                    <span class="stat-value" id="completed-interviews">${attendedInterviews}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Placement Success Rate</span>
                    <span class="stat-value">${clientWinRate}%</span>
                </div>
                <div style="margin-top: 8px; font-size: 9px; color: #2e7d32; font-weight: 600;">
                    Lead to Placement: ${totalClients > 0 ? ((wonClients / totalClients) * 100).toFixed(1) : 0}%
                </div>
            </div>

            <div class="card">
                <div class="card-title">System Performance</div>
                <div class="stat-row">
                    <span class="stat-label">Total Inquiries Processed</span>
                    <span class="stat-value">${totalClients + totalCandidates}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Interview Conversion</span>
                    <span class="stat-value">${interviewSuccessRate}%</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Active Pipeline</span>
                    <span class="stat-value">${activeClients + pendingClients}</span>
                </div>
                <div style="margin-top: 10px; padding: 7px; background: #f0f9ff; border-radius: 5px;">
                    <div style="font-size: 9px; color: #666; margin-bottom: 3px;">Monthly Growth</div>
                    <div class="highlight-number">${totalClients + totalCandidates} <span style="font-size: 11px; font-weight: normal;">total leads</span></div>
                </div>
            </div>
        </div>

        <div class="section-header">CHALLENGES & LEARNINGS</div>

        <div class="two-col">
            <div class="card">
                <div class="card-title">Challenges & Learnings</div>
                <div class="stat-row">
                    <span class="stat-label">Lost Candidates</span>
                    <span class="stat-value">${lostCandidates}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Lost Clients</span>
                    <span class="stat-value">${lostClients}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Failed Interviews</span>
                    <span class="stat-value">${octoberData.interviews.length - attendedInterviews}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Conversion Gap</span>
                    <span class="stat-value">${totalClients - wonClients} clients</span>
                </div>
                <div style="margin-top: 8px; font-size: 9px; color: #d32f2f; font-weight: 600;">
                    Attrition Rate: ${totalCandidates > 0 ? ((lostCandidates / totalCandidates) * 100).toFixed(1) : 0}%
                </div>
            </div>

            <div class="card">
                <div class="card-title">Pipeline Health Analysis</div>
                <div class="stat-row">
                    <span class="stat-label">Active Clients</span>
                    <span class="stat-value">${activeClients}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Pending Clients</span>
                    <span class="stat-value">${pendingClients}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Pending Candidates</span>
                    <span class="stat-value">${pendingCandidates}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Lead to Won Ratio</span>
                    <span class="stat-value">1:${totalClients > 0 ? Math.round(totalClients / Math.max(wonClients, 1)) : 0}</span>
                </div>
            </div>
        </div>

        <div class="section-header">CLIENT CONVERSION FUNNEL</div>

        <div class="funnel">
            <div class="funnel-stage">
                <span>Total Client Inquiries</span>
                <span>${totalClients} (100%)</span>
            </div>
            <div class="funnel-stage">
                <span>Active + Communication Ongoing</span>
                <span>${activeClients + pendingClients} (${totalClients > 0 ? (((activeClients + pendingClients) / totalClients) * 100).toFixed(1) : 0}%)</span>
            </div>
            <div class="funnel-stage">
                <span>Won Clients</span>
                <span>${wonClients} (${clientWinRate}%)</span>
            </div>
            <div class="funnel-stage">
                <span>Successful Placements</span>
                <span>${wonClients} (${clientWinRate}%)</span>
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
            <div class="insight-text" id="client-insights">
                Loading AI-powered insights...
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
                <div class="metric-value" id="won-candidates">47</div>
                <div class="metric-label">WON Candidates</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="total-interviews">30</div>
                <div class="metric-label">Interviews Conducted</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="interview-success">96.7%</div>
                <div class="metric-label">Interview Success</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="total-candidates">258</div>
                <div class="metric-label">Total Applications</div>
            </div>
        </div>

        <div class="insight-box">
            <div class="insight-title">AI-Powered Candidate Insights</div>
            <div class="insight-text" id="candidate-insights">
                Loading AI-powered insights...
            </div>
        </div>

        <div class="section-header">CANDIDATE PIPELINE STATUS</div>

        <div class="four-col">
            <div class="status-card" style="border-color: #2e7d32;">
                <div class="status-number" style="color: #2e7d32;" id="won-candidates-status">47</div>
                <div class="status-label">Won</div>
                <div style="font-size: 8px; color: #999; margin-top: 2px;" id="won-candidates-percent">18.2%</div>
            </div>
            <div class="status-card" style="border-color: #1565c0;">
                <div class="status-number" style="color: #1565c0;" id="pending-candidates">13</div>
                <div class="status-label">Pending</div>
                <div style="font-size: 8px; color: #999; margin-top: 2px;">5.0%</div>
            </div>
            <div class="status-card" style="border-color: #f57c00;">
                <div class="status-number" style="color: #f57c00;" id="interview-candidates">30</div>
                <div class="status-label">Interviewed</div>
                <div style="font-size: 8px; color: #999; margin-top: 2px;">11.6%</div>
            </div>
            <div class="status-card" style="border-color: #c62828;">
                <div class="status-number" style="color: #c62828;" id="lost-candidates">168</div>
                <div class="status-label">Lost</div>
                <div style="font-size: 8px; color: #999; margin-top: 2px;">65.1%</div>
            </div>
        </div>

        <div class="section-header">TOP PERFORMING SOURCES</div>

        <div class="two-col">
            <div class="card">
                <div class="card-title">Client Acquisition Channels</div>
                <div id="client-sources">
                    <div class="stat-row">
                        <span class="stat-label">Instagram</span>
                        <span class="stat-value">11 leads</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Google Search</span>
                        <span class="stat-value">10 leads</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Referrals</span>
                        <span class="stat-value">6 leads</span>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">Candidate Recruitment Channels</div>
                <div id="candidate-sources">
                    <div class="stat-row">
                        <span class="stat-label">Facebook</span>
                        <span class="stat-value">89 applications</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Instagram</span>
                        <span class="stat-value">67 applications</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">TikTok</span>
                        <span class="stat-value">45 applications</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="section-header">ROLE DEMAND vs SUPPLY ANALYSIS</div>

        <table class="table">
            <thead>
                <tr>
                    <th>Role</th>
                    <th>Client Demand</th>
                    <th>Candidate Supply</th>
                    <th>Supply Ratio</th>
                    <th>Market Status</th>
                </tr>
            </thead>
            <tbody id="role-analysis">
                <tr>
                    <td>House Manager</td>
                    <td>20</td>
                    <td>89</td>
                    <td>4.5:1</td>
                    <td><span class="badge" style="background: #d4edda; color: #155724;">Oversupplied</span></td>
                </tr>
                <tr>
                    <td>Housekeeper</td>
                    <td>11</td>
                    <td>67</td>
                    <td>6.1:1</td>
                    <td><span class="badge" style="background: #d4edda; color: #155724;">Oversupplied</span></td>
                </tr>
                <tr>
                    <td>Nanny</td>
                    <td>5</td>
                    <td>45</td>
                    <td>9.0:1</td>
                    <td><span class="badge" style="background: #d4edda; color: #155724;">Oversupplied</span></td>
                </tr>
            </tbody>
        </table>

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

  const getOctoberReportHTML = () => {
    // Filter current data for October 2025
    const octoberData = {
      clients: clients.filter(c => {
        const date = new Date(c.created_at)
        return date.getFullYear() === 2025 && date.getMonth() === 9 // October is month 9
      }),
      candidates: candidates.filter(c => {
        const date = new Date(c.created_at)
        return date.getFullYear() === 2025 && date.getMonth() === 9
      }),
      interviews: interviews.filter(i => {
        const date = new Date(i.created_at)
        return date.getFullYear() === 2025 && date.getMonth() === 9
      }),
      trainingLeads: trainingLeads.filter(t => {
        const date = new Date(t.created_at)
        return date.getFullYear() === 2025 && date.getMonth() === 9
      })
    }
    
    // Calculate October metrics
    const totalClients = octoberData.clients.length
    const totalCandidates = octoberData.candidates.length
    const wonClients = octoberData.clients.filter(c => c.status === 'Won').length
    const wonCandidates = octoberData.candidates.filter(c => c.status === 'WON').length
    const clientWinRate = totalClients > 0 ? ((wonClients / totalClients) * 100).toFixed(1) : '0'
    const candidateWinRate = totalCandidates > 0 ? ((wonCandidates / totalCandidates) * 100).toFixed(1) : '0'
    
    const activeClients = octoberData.clients.filter(c => c.status?.includes('Client -')).length
    const lostClients = octoberData.clients.filter(c => ['Ghosted', 'Lost', 'Budget', 'Competition'].includes(c.status)).length
    const pendingClients = octoberData.clients.filter(c => c.status?.includes('Pending')).length
    
    const lostCandidates = octoberData.candidates.filter(c => c.status === 'LOST').length
    const pendingCandidates = octoberData.candidates.filter(c => c.status?.includes('Pending') || c.status === 'NEW').length
    const attendedInterviews = octoberData.interviews.filter(i => i.attended).length
    const interviewSuccessRate = octoberData.interviews.length > 0 ? ((attendedInterviews / octoberData.interviews.length) * 100).toFixed(1) : '0'
    
    // Default executive summary for October 2025
    const executiveSummary = totalClients > 0 || totalCandidates > 0 
      ? `October 2025 performance shows ${totalClients} client inquiries with ${clientWinRate}% conversion rate and ${totalCandidates} candidate applications achieving ${candidateWinRate}% success rate. The business demonstrates ${wonClients} successful client placements and ${wonCandidates} qualified candidates onboarded. With ${activeClients} active clients and ${octoberData.interviews.length} interviews conducted (${interviewSuccessRate}% success rate), the pipeline shows steady progress. Key focus areas include optimizing conversion rates and enhancing candidate quality screening processes.`
      : 'October 2025 represents a foundational period for Nestara with system setup and initial market positioning. While client and candidate volumes remain at baseline levels, this period establishes the operational framework for future growth. Focus areas include market entry strategies, brand awareness campaigns, and pipeline development initiatives to drive engagement in subsequent months.'
    
    return getTemplateHTML()
      .replace(/id="executive-summary"[^>]*>Loading AI-powered insights\.\.\./g, `id="executive-summary">${executiveSummary}`)
      .replace(/<div class="metric-value">39<\/div>/g, `<div class="metric-value">${totalClients}</div>`)
      .replace(/<div class="metric-value">258<\/div>/g, `<div class="metric-value">${totalCandidates}</div>`)
      .replace(/<div class="metric-value">18\.2%<\/div>/g, `<div class="metric-value">${candidateWinRate}%</div>`)
      .replace(/<div class="metric-value">10\.3%<\/div>/g, `<div class="metric-value">${clientWinRate}%</div>`)
      .replace(/<div class="status-number" style="color: #2e7d32;">4<\/div>/g, `<div class="status-number" style="color: #2e7d32;">${wonClients}</div>`)
      .replace(/<div class="status-number" style="color: #1565c0;">11<\/div>/g, `<div class="status-number" style="color: #1565c0;">${activeClients}</div>`)
      .replace(/<div class="status-number" style="color: #f57c00;">6<\/div>/g, `<div class="status-number" style="color: #f57c00;">${pendingClients}</div>`)
      .replace(/<div class="status-number" style="color: #c62828;">18<\/div>/g, `<div class="status-number" style="color: #c62828;">${lostClients}</div>`)
      .replace(/October 1 - 31, 2025/g, 'October 1 - 31, 2025')
      .replace(/October 25, 2025/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
  }

  const getReportHTML = () => {
    const metrics = getBusinessMetrics()
    const statusBreakdown = getClientStatusBreakdown()
    const sourcePerformance = getSourcePerformance()
    const roleAnalysis = getRoleAnalysis()
    
    const wonClients = clients.filter(c => c.status === 'Won')
    const activeClients = clients.filter(c => c.status?.includes('Client -'))
    const lostClients = clients.filter(c => ['Ghosted', 'Lost', 'Budget', 'Competition'].includes(c.status))
    const pendingClients = clients.filter(c => c.status?.includes('Pending'))
    
    const wonCandidates = candidates.filter(c => c.status === 'WON')
    const lostCandidates = candidates.filter(c => c.status === 'LOST')
    const pendingCandidates = candidates.filter(c => c.status?.includes('Pending') || c.status === 'NEW')
    const attendedInterviews = interviews.filter(i => i.attended)
    
    // Generate source performance HTML
    const clientSourcesHTML = sourcePerformance.slice(0, 3).map(source => 
      `<div class="stat-row">
        <span class="stat-label">${source.source}</span>
        <span class="stat-value">${source.clientsTotal} leads</span>
      </div>`
    ).join('')
    
    const candidateSourcesHTML = sourcePerformance.slice(0, 3).map(source => 
      `<div class="stat-row">
        <span class="stat-label">${source.source}</span>
        <span class="stat-value">${source.candidatesTotal} applications</span>
      </div>`
    ).join('')
    
    // Generate role analysis HTML
    const roleAnalysisHTML = roleAnalysis.slice(0, 5).map(role => {
      const ratio = role.supply > 0 ? `${(role.supply / Math.max(role.demand, 1)).toFixed(1)}:1` : '0:1'
      const status = role.supply > role.demand * 2 ? 'Oversupplied' : role.supply < role.demand ? 'Undersupplied' : 'Balanced'
      const statusColor = status === 'Oversupplied' ? '#d4edda; color: #155724' : status === 'Undersupplied' ? '#f8d7da; color: #721c24' : '#fff3cd; color: #856404'
      
      return `<tr>
        <td>${role.role}</td>
        <td>${role.demand}</td>
        <td>${role.supply}</td>
        <td>${ratio}</td>
        <td><span class="badge" style="background: ${statusColor};">${status}</span></td>
      </tr>`
    }).join('')
    
    let html = getTemplateHTML()
    
    // Replace all dynamic values
    html = html.replace(/id="executive-summary"[^>]*>Loading AI-powered insights\.\.\./g, 
      `id="executive-summary">${executiveSummary || 'Generating comprehensive business insights based on current data trends and performance metrics.'}`)
    
    html = html.replace(/id="client-insights"[^>]*>Loading AI-powered insights\.\.\./g, 
      `id="client-insights">${clientInsights || 'Analyzing client acquisition performance and conversion patterns.'}`)
    
    html = html.replace(/id="candidate-insights"[^>]*>Loading AI-powered insights\.\.\./g, 
      `id="candidate-insights">${candidateInsights || 'Evaluating candidate recruitment effectiveness and pipeline quality.'}`)
    
    // Replace metrics
    html = html.replace(/<div class="metric-value">39<\/div>/g, `<div class="metric-value">${metrics.totalClients}</div>`)
    html = html.replace(/<div class="metric-value">258<\/div>/g, `<div class="metric-value">${metrics.totalCandidates}</div>`)
    html = html.replace(/<div class="metric-value">18\.2%<\/div>/g, `<div class="metric-value">${metrics.candidateWinRate}%</div>`)
    html = html.replace(/<div class="metric-value">10\.3%<\/div>/g, `<div class="metric-value">${metrics.clientWinRate}%</div>`)
    
    // Replace status numbers
    html = html.replace(/id="won-candidates"[^>]*>47/g, `id="won-candidates">${wonCandidates.length}`)
    html = html.replace(/id="total-interviews"[^>]*>30/g, `id="total-interviews">${interviews.length}`)
    html = html.replace(/id="interview-success"[^>]*>96\.7%/g, `id="interview-success">${interviews.length > 0 ? ((attendedInterviews.length / interviews.length) * 100).toFixed(1) : 0}%`)
    html = html.replace(/id="total-candidates"[^>]*>258/g, `id="total-candidates">${metrics.totalCandidates}`)
    
    // Replace pipeline status
    html = html.replace(/id="won-candidates-status"[^>]*>47/g, `id="won-candidates-status">${wonCandidates.length}`)
    html = html.replace(/id="won-candidates-percent"[^>]*>18\.2%/g, `id="won-candidates-percent">${metrics.candidateWinRate}%`)
    html = html.replace(/id="pending-candidates"[^>]*>13/g, `id="pending-candidates">${pendingCandidates.length}`)
    html = html.replace(/id="interview-candidates"[^>]*>30/g, `id="interview-candidates">${interviews.length}`)
    html = html.replace(/id="lost-candidates"[^>]*>168/g, `id="lost-candidates">${lostCandidates.length}`)
    
    // Replace client status numbers
    html = html.replace(/<div class="status-number" style="color: #2e7d32;">4<\/div>/g, `<div class="status-number" style="color: #2e7d32;">${wonClients.length}</div>`)
    html = html.replace(/<div class="status-number" style="color: #1565c0;">11<\/div>/g, `<div class="status-number" style="color: #1565c0;">${activeClients.length}</div>`)
    html = html.replace(/<div class="status-number" style="color: #f57c00;">6<\/div>/g, `<div class="status-number" style="color: #f57c00;">${pendingClients.length}</div>`)
    html = html.replace(/<div class="status-number" style="color: #c62828;">18<\/div>/g, `<div class="status-number" style="color: #c62828;">${lostClients.length}</div>`)
    
    // Replace source performance
    html = html.replace(/id="client-sources"[^>]*>[\s\S]*?<\/div>/g, `id="client-sources">${clientSourcesHTML}</div>`)
    html = html.replace(/id="candidate-sources"[^>]*>[\s\S]*?<\/div>/g, `id="candidate-sources">${candidateSourcesHTML}</div>`)
    
    // Replace role analysis table
    html = html.replace(/id="role-analysis"[^>]*>[\s\S]*?<\/tbody>/g, `id="role-analysis">${roleAnalysisHTML}</tbody>`)
    
    // Replace dates
    const reportPeriod = getDateRangeText()
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const shortDate = reportPeriod.length > 25 ? reportPeriod.substring(0, 20) + '...' : reportPeriod
    
    html = html.replace(/id="report-period"[^>]*>September 15 - October 22, 2025/g, `id="report-period">${reportPeriod}`)
    html = html.replace(/id="generated-date"[^>]*>Generated: October 25, 2025/g, `id="generated-date">Generated: ${currentDate}`)
    html = html.replace(/September 15 - October 22, 2025/g, reportPeriod)
    html = html.replace(/Sep 15 - Oct 22, 2025/g, shortDate)
    html = html.replace(/October 25, 2025/g, currentDate)
    
    return html
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
        <div className="flex gap-2">
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>
          <button
            onClick={generateReport}
            disabled={!dateRange.start || !dateRange.end || generatingInsights}
            className="flex items-center gap-2 px-4 py-2 bg-nestalk-primary text-white rounded hover:bg-nestalk-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingInsights ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {generatingInsights ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
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