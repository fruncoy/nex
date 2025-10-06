import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart3, TrendingUp, Calendar, Users, CheckCircle, XCircle, RefreshCcw, PieChart, Target, Award, Filter, DollarSign } from 'lucide-react'

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

export function Insights() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const [clients, setClients] = useState<Client[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [activeTab, setActiveTab] = useState('general')
  const [trendView, setTrendView] = useState('monthly')

  const roles = ['Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver', 'Housekeeper']
  const sources = ['Facebook', 'Instagram', 'Google Search', 'Website', 'Referral', 'Walk-in poster', 'TikTok', 'LinkedIn', 'Youtube']

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadData()
  }, [dateRange])



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

  const getFilteredClients = () => {
    let filteredClients = clients
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start)
      const endDate = new Date(dateRange.end + 'T23:59:59Z')
      filteredClients = clients.filter(c => {
        const createdDate = new Date(c.created_at)
        return createdDate >= startDate && createdDate <= endDate
      })
    }
    return filteredClients
  }

  const getFilteredCandidates = () => {
    return candidates
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  const getDateRangeData = () => {
    let startDate = new Date()
    let endDate = new Date()
    
    if (dateRange.start && dateRange.end) {
      startDate = new Date(dateRange.start)
      endDate = new Date(dateRange.end + 'T23:59:59Z')
    } else {
      // Default to MTD if no range selected
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    }
    
    const wonClients = clients.filter(c => {
      const createdDate = new Date(c.created_at)
      return c.status === 'Won' && createdDate >= startDate && createdDate <= endDate
    }).length
    
    const wonCandidates = candidates.filter(c => {
      const createdDate = new Date(c.created_at)
      return c.status === 'WON' && createdDate >= startDate && createdDate <= endDate
    }).length
    
    const lostClients = clients.filter(c => {
      const createdDate = new Date(c.created_at)
      return c.status.includes('Lost') && createdDate >= startDate && createdDate <= endDate
    }).length
    
    const lostCandidates = candidates.filter(c => {
      const createdDate = new Date(c.created_at)
      return c.status === 'LOST' && createdDate >= startDate && createdDate <= endDate
    }).length
    
    const totalClientOutcomes = wonClients + lostClients
    const totalCandidateOutcomes = wonCandidates + lostCandidates
    
    const clientWinRate = totalClientOutcomes > 0 ? Math.round((wonClients / totalClientOutcomes) * 100) : 0
    const candidateWinRate = totalCandidateOutcomes > 0 ? Math.round((wonCandidates / totalCandidateOutcomes) * 100) : 0
    const clientLossRate = totalClientOutcomes > 0 ? Math.round((lostClients / totalClientOutcomes) * 100) : 0
    const candidateLossRate = totalCandidateOutcomes > 0 ? Math.round((lostCandidates / totalCandidateOutcomes) * 100) : 0
    
    return {
      wonClients,
      wonCandidates,
      lostClients,
      lostCandidates,
      clientWinRate,
      candidateWinRate,
      clientLossRate,
      candidateLossRate,
      overallWinRate: (totalClientOutcomes + totalCandidateOutcomes) > 0 ? 
        Math.round(((wonClients + wonCandidates) / (totalClientOutcomes + totalCandidateOutcomes)) * 100) : 0,
      overallLossRate: (totalClientOutcomes + totalCandidateOutcomes) > 0 ? 
        Math.round(((lostClients + lostCandidates) / (totalClientOutcomes + totalCandidateOutcomes)) * 100) : 0
    }
  }

  const getClientStatusDistribution = () => {
    const filteredClients = getFilteredClients()
    const statusCounts = filteredClients.reduce((acc, client) => {
      let status = client.status
      if (status.includes(' - ')) status = status.split(' - ')[0]
      if (status.includes('Lost')) status = 'Lost'
      if (status.includes('Active')) status = 'Active'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(statusCounts).map(([status, count]) => ({ status, count }))
  }

  const getCandidateStatusDistribution = () => {
    const filteredCandidates = getFilteredCandidates()
    const statusCounts = filteredCandidates.reduce((acc, candidate) => {
      acc[candidate.status] = (acc[candidate.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(statusCounts).map(([status, count]) => ({ status, count }))
  }

  const getTopSources = () => {
    const clientSources = clients
      .reduce((acc, c) => {
        const source = c.source || 'Other'
        acc[source] = (acc[source] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    
    const candidateSources = candidates
      .reduce((acc, c) => {
        const source = c.source || 'Other'
        acc[source] = (acc[source] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    
    const topClientSource = Object.entries(clientSources).sort(([,a], [,b]) => b - a)[0]
    const topCandidateSource = Object.entries(candidateSources).sort(([,a], [,b]) => b - a)[0]
    
    return {
      topClientSource: topClientSource ? topClientSource[0] : 'No data',
      topCandidateSource: topCandidateSource ? topCandidateSource[0] : 'No data'
    }
  }

  const getAvgTimeToHire = () => {
    // Placeholder - would need interview and hire dates from DB
    return 0
  }

  const getOpenRoles = () => {
    // Count unique roles from pending clients
    const openRoles = new Set(
      clients
        .filter(c => c.status === 'Pending' || c.status.includes('Active'))
        .map(c => c.want_to_hire)
    )
    return openRoles.size
  }

  const getSourcePerformance = () => {
    const allSources = [...new Set([...clients.map(c => c.source || 'Other'), ...candidates.map(c => c.source || 'Other')])]
    
    return allSources.map(source => {
      const clientsTotal = clients.filter(c => (c.source || 'Other') === source).length
      const candidatesTotal = candidates.filter(c => (c.source || 'Other') === source).length
      
      return {
        source,
        clientsWon: clientsTotal,
        candidatesHired: candidatesTotal
      }
    })
  }

  const getRoleGapData = () => {
    const roleRequests = clients.reduce((acc, c) => {
      acc[c.want_to_hire] = (acc[c.want_to_hire] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(roleRequests)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([role, requests]) => ({ role, requests }))
  }

  const getFunnelData = () => {
    const applied = candidates.length
    const interviewed = candidates.filter(c => 
      c.status === 'INTERVIEW_SCHEDULED' || c.status === 'WON' || c.status === 'LOST'
    ).length
    const won = candidates.filter(c => c.status === 'WON').length
    
    const conversionRate = interviewed > 0 ? Math.round((won / interviewed) * 100) : 0
    
    return {
      applied,
      interviewed,
      won,
      conversionRate
    }
  }

  const getRoleGap = () => {
    const requestedRoles = getFilteredClients().reduce((acc, c) => {
      acc[c.want_to_hire] = (acc[c.want_to_hire] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const hiredRoles = getFilteredCandidates()
      .filter(c => c.status === 'WON')
      .reduce((acc, c) => {
        acc[c.role] = (acc[c.role] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    
    const mostRequested = Object.entries(requestedRoles).sort(([,a], [,b]) => b - a)[0]
    const mostHired = Object.entries(hiredRoles).sort(([,a], [,b]) => b - a)[0]
    
    return {
      mostRequested: mostRequested ? { role: mostRequested[0], count: mostRequested[1] } : null,
      mostHired: mostHired ? { role: mostHired[0], count: mostHired[1] } : null
    }
  }

  const getConversionRate = () => {
    const filteredCandidates = getFilteredCandidates()
    const interviewed = filteredCandidates.filter(c => 
      c.status === 'INTERVIEW_SCHEDULED' || c.status === 'WON' || c.status === 'LOST'
    ).length
    const hired = filteredCandidates.filter(c => c.status === 'WON').length
    
    return interviewed > 0 ? Math.round((hired / interviewed) * 100) : 0
  }

  const getAvgTimeToOutcome = (outcome: string) => {
    const outcomeClients = clients.filter(c => 
      outcome === 'Won' ? c.status === 'Won' : c.status.includes('Lost')
    )
    
    if (outcomeClients.length === 0) return 0
    
    const totalDays = outcomeClients.reduce((sum, client) => {
      const created = new Date(client.created_at)
      const now = new Date()
      const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
      return sum + days
    }, 0)
    
    return Math.round(totalDays / outcomeClients.length)
  }

  const getPipelineVelocity = () => {
    const completedClients = clients.filter(c => c.status === 'Won' || c.status.includes('Lost'))
    if (completedClients.length === 0) return 0
    
    const totalDays = completedClients.reduce((sum, client) => {
      const created = new Date(client.created_at)
      const now = new Date()
      const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
      return sum + days
    }, 0)
    
    return Math.round(totalDays / completedClients.length)
  }

  const getMonthlyTrend = () => {
    const last6Months = []
    const now = new Date()
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = date.toLocaleDateString('en-US', { month: 'short' })
      const count = clients.filter(c => {
        const clientDate = new Date(c.created_at)
        return clientDate.getMonth() === date.getMonth() && clientDate.getFullYear() === date.getFullYear()
      }).length
      
      last6Months.push({ period: monthName, count })
    }
    
    return last6Months
  }

  const getDailyTrend = () => {
    const last30Days = []
    const now = new Date()
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dayName = date.getDate().toString()
      const count = clients.filter(c => {
        const clientDate = new Date(c.created_at)
        return clientDate.toDateString() === date.toDateString()
      }).length
      
      last30Days.push({ period: dayName, count })
    }
    
    return last30Days
  }

  const getMostRequestedRoles = () => {
    const roleCounts = clients.reduce((acc, c) => {
      acc[c.want_to_hire] = (acc[c.want_to_hire] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(roleCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([role, count]) => ({ role, count }))
  }

  const getRoleWinRates = () => {
    const roleStats = clients.reduce((acc, c) => {
      const role = c.want_to_hire
      if (!acc[role]) acc[role] = { total: 0, won: 0, lost: 0 }
      acc[role].total++
      if (c.status === 'Won') acc[role].won++
      if (c.status.includes('Lost')) acc[role].lost++
      return acc
    }, {} as Record<string, { total: number, won: number, lost: number }>)
    
    return Object.entries(roleStats)
      .filter(([, stats]) => (stats.won + stats.lost) > 0)
      .map(([role, stats]) => ({
        role,
        total: stats.total,
        winRate: Math.round((stats.won / (stats.won + stats.lost)) * 100)
      }))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 5)
  }

  const getPipelineBottlenecks = () => {
    const statusGroups = ['Pending', 'Active', 'Won', 'Lost']
    
    return statusGroups.map(status => {
      const statusClients = clients.filter(c => {
        if (status === 'Lost') return c.status.includes('Lost')
        if (status === 'Active') return c.status.includes('Active')
        return c.status === status
      })
      
      if (statusClients.length === 0) return { status, avgDays: 0, count: 0 }
      
      const totalDays = statusClients.reduce((sum, client) => {
        const created = new Date(client.created_at)
        const now = new Date()
        const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
        return sum + days
      }, 0)
      
      return {
        status,
        avgDays: Math.round(totalDays / statusClients.length),
        count: statusClients.length
      }
    })
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

  const dateRangeData = getDateRangeData()
  const clientStatusData = getClientStatusDistribution()
  const candidateStatusData = getCandidateStatusDistribution()
  const { topClientSource, topCandidateSource } = getTopSources()
  const { mostRequested, mostHired } = getRoleGap()
  const avgTimeToHire = getAvgTimeToHire()
  const openRoles = getOpenRoles()
  const sourcePerformance = getSourcePerformance()
  const roleGapData = getRoleGapData()
  const funnelData = getFunnelData()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
        <p className="text-gray-600">Comprehensive analytics and performance metrics</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3 items-end">
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
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[['general', 'General'], ['clients', 'Clients'], ['candidates', 'Candidates'], ['business', 'Business Core']].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-nestalk-primary text-nestalk-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Primary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-50 rounded-lg"><Award className="w-5 h-5 text-green-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500" title="Count of clients marked Won within date range">Won Clients</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(dateRangeData.wonClients)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-50 rounded-lg"><CheckCircle className="w-5 h-5 text-blue-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500" title="Count of candidates marked Hired within date range">Won Candidates</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(dateRangeData.wonCandidates)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500" title="Won / (Won + Lost) within range">Win Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{dateRangeData.overallWinRate}%</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-red-50 rounded-lg"><XCircle className="w-5 h-5 text-red-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500" title="Lost / (Won + Lost) within range">Loss Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{dateRangeData.overallLossRate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-50 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Client Win Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{dateRangeData.clientWinRate}%</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-50 rounded-lg"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Candidate Win Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{dateRangeData.candidateWinRate}%</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-red-50 rounded-lg"><XCircle className="w-5 h-5 text-red-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Client Loss Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{dateRangeData.clientLossRate}%</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-red-50 rounded-lg"><XCircle className="w-5 h-5 text-red-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Candidate Loss Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{dateRangeData.candidateLossRate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Source Performance Chart */}
            <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Source Performance</h3>
              <div className="space-y-3">
                {sourcePerformance.map(({ source, clientsWon, candidatesHired }) => (
                  <div key={source} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg gap-2">
                    <span className="text-sm font-medium text-gray-700">{source}</span>
                    <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm">
                      <span className="text-green-600">Clients: {clientsWon}</span>
                      <span className="text-blue-600">Candidates: {candidatesHired}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Role Requests */}
            <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Requests</h3>
              <div className="space-y-3">
                {roleGapData.map(({ role, requests }) => (
                  <div key={role} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{role}</span>
                    <span className="text-base md:text-lg font-bold text-nestalk-primary">{requests}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Client Funnel */}
          <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Funnel</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="bg-blue-100 rounded-lg p-3 md:p-4">
                  <p className="text-xl md:text-2xl font-bold text-blue-600">{formatNumber(clients.length)}</p>
                  <p className="text-xs text-gray-600">Total Inquiries</p>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-yellow-100 rounded-lg p-3 md:p-4">
                  <p className="text-xl md:text-2xl font-bold text-yellow-600">{formatNumber(clients.filter(c => c.status.includes('Active')).length)}</p>
                  <p className="text-xs text-gray-600">Active</p>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-green-100 rounded-lg p-3 md:p-4">
                  <p className="text-xl md:text-2xl font-bold text-green-600">{formatNumber(clients.filter(c => c.status === 'Won').length)}</p>
                  <p className="text-xs text-gray-600">Won</p>
                </div>
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs md:text-sm text-gray-600">Active → Won Conversion: <span className="font-bold text-nestalk-primary">{(() => {
                const active = clients.filter(c => c.status.includes('Active')).length
                const won = clients.filter(c => c.status === 'Won').length
                const total = active + won
                return total > 0 ? Math.round((won / total) * 100) : 0
              })()}%</span></p>
              <p className="text-xs text-gray-500">Formula: Won / (Active + Won)</p>
            </div>
          </div>

          {/* Candidate Funnel */}
          <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Candidate Funnel</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="bg-blue-100 rounded-lg p-3 md:p-4">
                  <p className="text-xl md:text-2xl font-bold text-blue-600">{formatNumber(funnelData.applied)}</p>
                  <p className="text-xs text-gray-600">Applied</p>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-yellow-100 rounded-lg p-3 md:p-4">
                  <p className="text-xl md:text-2xl font-bold text-yellow-600">{formatNumber(funnelData.interviewed)}</p>
                  <p className="text-xs text-gray-600">Interviewed</p>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-green-100 rounded-lg p-3 md:p-4">
                  <p className="text-xl md:text-2xl font-bold text-green-600">{formatNumber(funnelData.won)}</p>
                  <p className="text-xs text-gray-600">Won</p>
                </div>
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs md:text-sm text-gray-600">Interview → Won Conversion: <span className="font-bold text-nestalk-primary">{funnelData.conversionRate}%</span></p>
              <p className="text-xs text-gray-500">Formula: Won / Interviewed</p>
            </div>
          </div>
        </div>
      )}

      {/* Business Core Tab */}
      {activeTab === 'business' && (
        <div className="space-y-6">
          {/* Financial KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-50 rounded-lg"><DollarSign className="w-5 h-5 text-green-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Total Income</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${formatNumber((() => {
                      let startDate = new Date()
                      let endDate = new Date()
                      if (dateRange.start && dateRange.end) {
                        startDate = new Date(dateRange.start)
                        endDate = new Date(dateRange.end + 'T23:59:59Z')
                      } else {
                        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
                      }
                      return clients
                        .filter(c => {
                          const createdDate = new Date(c.created_at)
                          return c.status === 'Won' && c.placement_fee && 
                                 createdDate >= startDate && createdDate <= endDate
                        })
                        .reduce((sum, c) => sum + (c.placement_fee || 0), 0)
                    })())}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-red-50 rounded-lg"><XCircle className="w-5 h-5 text-red-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Total Refunded</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${formatNumber((() => {
                      let startDate = new Date()
                      let endDate = new Date()
                      if (dateRange.start && dateRange.end) {
                        startDate = new Date(dateRange.start)
                        endDate = new Date(dateRange.end + 'T23:59:59Z')
                      } else {
                        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
                      }
                      return clients
                        .filter(c => {
                          const createdDate = new Date(c.created_at)
                          return (c.placement_status === 'Refunded' || c.placement_status === 'Lost (Refunded)') && 
                                 c.placement_fee && createdDate >= startDate && createdDate <= endDate
                        })
                        .reduce((sum, c) => sum + (c.placement_fee || 0), 0)
                    })())}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-50 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Active Clients</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber((() => {
                      let startDate = new Date()
                      let endDate = new Date()
                      if (dateRange.start && dateRange.end) {
                        startDate = new Date(dateRange.start)
                        endDate = new Date(dateRange.end + 'T23:59:59Z')
                      } else {
                        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
                      }
                      return clients.filter(c => {
                        const createdDate = new Date(c.created_at)
                        return c.status === 'Won' && c.placement_status === 'Active' && createdDate >= startDate && createdDate <= endDate
                      }).length
                    })())}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-amber-50 rounded-lg"><RefreshCcw className="w-5 h-5 text-amber-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Refund Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(() => {
                      let startDate = new Date()
                      let endDate = new Date()
                      if (dateRange.start && dateRange.end) {
                        startDate = new Date(dateRange.start)
                        endDate = new Date(dateRange.end + 'T23:59:59Z')
                      } else {
                        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
                      }
                      const wonClients = clients.filter(c => {
                        const createdDate = new Date(c.created_at)
                        return c.status === 'Won' && createdDate >= startDate && createdDate <= endDate
                      })
                      const refundedClients = wonClients.filter(c => 
                        c.placement_status === 'Refunded' || c.placement_status === 'Lost (Refunded)'
                      )
                      return wonClients.length > 0 ? Math.round((refundedClients.length / wonClients.length) * 100) : 0
                    })()}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Net Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${formatNumber((() => {
                      let startDate = new Date()
                      let endDate = new Date()
                      if (dateRange.start && dateRange.end) {
                        startDate = new Date(dateRange.start)
                        endDate = new Date(dateRange.end + 'T23:59:59Z')
                      } else {
                        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
                      }
                      const totalIncome = clients
                        .filter(c => {
                          const createdDate = new Date(c.created_at)
                          return c.status === 'Won' && c.placement_fee && 
                                 createdDate >= startDate && createdDate <= endDate
                        })
                        .reduce((sum, c) => sum + (c.placement_fee || 0), 0)
                      const totalRefunded = clients
                        .filter(c => {
                          const createdDate = new Date(c.created_at)
                          return (c.placement_status === 'Refunded' || c.placement_status === 'Lost (Refunded)') && 
                                 c.placement_fee && createdDate >= startDate && createdDate <= endDate
                        })
                        .reduce((sum, c) => sum + (c.placement_fee || 0), 0)
                      return totalIncome - totalRefunded
                    })())}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-purple-50 rounded-lg"><Target className="w-5 h-5 text-purple-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Avg Placement Fee</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${formatNumber((() => {
                      let startDate = new Date()
                      let endDate = new Date()
                      if (dateRange.start && dateRange.end) {
                        startDate = new Date(dateRange.start)
                        endDate = new Date(dateRange.end + 'T23:59:59Z')
                      } else {
                        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
                      }
                      const wonClientsWithFees = clients.filter(c => {
                        const createdDate = new Date(c.created_at)
                        return c.status === 'Won' && c.placement_fee && 
                               createdDate >= startDate && createdDate <= endDate
                      })
                      if (wonClientsWithFees.length === 0) return 0
                      const totalFees = wonClientsWithFees.reduce((sum, c) => sum + (c.placement_fee || 0), 0)
                      return Math.round(totalFees / wonClientsWithFees.length)
                    })())}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-orange-50 rounded-lg"><XCircle className="w-5 h-5 text-orange-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Lost Clients</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber((() => {
                      let startDate = new Date()
                      let endDate = new Date()
                      if (dateRange.start && dateRange.end) {
                        startDate = new Date(dateRange.start)
                        endDate = new Date(dateRange.end + 'T23:59:59Z')
                      } else {
                        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
                      }
                      return clients.filter(c => {
                        const createdDate = new Date(c.created_at)
                        return (c.placement_status === 'Lost (Refunded)' || c.placement_status === 'Lost (No Refund)') && 
                               createdDate >= startDate && createdDate <= endDate
                      }).length
                    })())}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-red-50 rounded-lg"><RefreshCcw className="w-5 h-5 text-red-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Clients Refunded</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber((() => {
                      let startDate = new Date()
                      let endDate = new Date()
                      if (dateRange.start && dateRange.end) {
                        startDate = new Date(dateRange.start)
                        endDate = new Date(dateRange.end + 'T23:59:59Z')
                      } else {
                        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
                      }
                      return clients.filter(c => {
                        const createdDate = new Date(c.created_at)
                        return (c.placement_status === 'Refunded' || c.placement_status === 'Lost (Refunded)') && 
                               createdDate >= startDate && createdDate <= endDate
                      }).length
                    })())}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue by Source */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Source</h3>
            
            {/* Bar Chart */}
            <div className="mb-6">
              <div className="h-64 flex items-end justify-between px-4 border-b border-l border-gray-200 overflow-x-auto">
                {(() => {
                  let startDate = new Date()
                  let endDate = new Date()
                  if (dateRange.start && dateRange.end) {
                    startDate = new Date(dateRange.start)
                    endDate = new Date(dateRange.end + 'T23:59:59Z')
                  } else {
                    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
                  }
                  
                  const sourceData = sources.map(source => {
                    const sourceClients = clients.filter(c => {
                      const createdDate = new Date(c.created_at)
                      return (c.source || 'Other') === source && c.status === 'Won' && 
                             c.placement_fee && createdDate >= startDate && createdDate <= endDate
                    })
                    
                    const totalRevenue = sourceClients.reduce((sum, c) => sum + (c.placement_fee || 0), 0)
                    const refundedRevenue = sourceClients
                      .filter(c => c.placement_status === 'Refunded' || c.placement_status === 'Lost (Refunded)')
                      .reduce((sum, c) => sum + (c.placement_fee || 0), 0)
                    const netRevenue = totalRevenue - refundedRevenue
                    
                    return { source, totalRevenue, netRevenue, refundedRevenue }
                  }).filter(d => d.totalRevenue > 0)
                  
                  const maxRevenue = Math.max(...sourceData.map(d => d.totalRevenue))
                  
                  return sourceData.map(({ source, totalRevenue, netRevenue, refundedRevenue }) => {
                    const totalHeight = maxRevenue > 0 ? (totalRevenue / maxRevenue) * 200 : 0
                    const netHeight = maxRevenue > 0 ? (netRevenue / maxRevenue) * 200 : 0
                    
                    return (
                      <div key={source} className="flex flex-col items-center min-w-0 flex-shrink-0">
                        <div className="mb-2 text-xs text-gray-600">${formatNumber(netRevenue)}</div>
                        <div className="relative">
                          <div 
                            className="w-12 bg-gray-300 rounded-t" 
                            style={{ height: `${totalHeight}px`, minHeight: '2px' }}
                          ></div>
                          <div 
                            className="w-12 bg-green-500 rounded-t absolute bottom-0" 
                            style={{ height: `${netHeight}px`, minHeight: '2px' }}
                          ></div>
                        </div>
                        <div className="mt-2 text-xs text-gray-700 text-center w-16">
                          <div className="transform -rotate-45 origin-center whitespace-nowrap">{source}</div>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
              <div className="mt-2 flex justify-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-300 rounded"></div>
                  <span>Total Revenue</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Net Revenue</span>
                </div>
              </div>
            </div>
            
            {/* Detailed List */}
            <div className="space-y-4">
              {sources.map(source => {
                let startDate = new Date()
                let endDate = new Date()
                if (dateRange.start && dateRange.end) {
                  startDate = new Date(dateRange.start)
                  endDate = new Date(dateRange.end + 'T23:59:59Z')
                } else {
                  startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
                }
                
                const sourceClients = clients.filter(c => {
                  const createdDate = new Date(c.created_at)
                  return (c.source || 'Other') === source && c.status === 'Won' && 
                         c.placement_fee && createdDate >= startDate && createdDate <= endDate
                })
                
                const totalRevenue = sourceClients.reduce((sum, c) => sum + (c.placement_fee || 0), 0)
                const refundedRevenue = sourceClients
                  .filter(c => c.placement_status === 'Refunded' || c.placement_status === 'Lost (Refunded)')
                  .reduce((sum, c) => sum + (c.placement_fee || 0), 0)
                const netRevenue = totalRevenue - refundedRevenue
                
                if (totalRevenue === 0) return null
                
                return (
                  <div key={source} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-gray-900">{source}</h4>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">${formatNumber(netRevenue)}</div>
                        <div className="text-xs text-gray-500">Net Revenue</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Total Income</div>
                        <div className="font-semibold">${formatNumber(totalRevenue)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Refunded</div>
                        <div className="font-semibold text-red-600">${formatNumber(refundedRevenue)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Clients</div>
                        <div className="font-semibold">{sourceClients.length}</div>
                      </div>
                    </div>
                  </div>
                )
              }).filter(Boolean)}
            </div>
          </div>

          {/* Financial Trends */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
            <div className="flex gap-4 mb-4">
              <button 
                onClick={() => setTrendView('monthly')} 
                className={`px-3 py-1 text-sm rounded ${trendView === 'monthly' ? 'bg-nestalk-primary text-white' : 'bg-gray-100'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setTrendView('daily')} 
                className={`px-3 py-1 text-sm rounded ${trendView === 'daily' ? 'bg-nestalk-primary text-white' : 'bg-gray-100'}`}
              >
                Daily (Last 30)
              </button>
            </div>
            <div className="h-64 flex items-end justify-between px-4 border-b border-l border-gray-200 overflow-x-auto">
              {(() => {
                const trendData = trendView === 'monthly' ? 
                  (() => {
                    const last6Months = []
                    const now = new Date()
                    for (let i = 5; i >= 0; i--) {
                      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
                      const monthName = date.toLocaleDateString('en-US', { month: 'short' })
                      const revenue = clients.filter(c => {
                        const clientDate = new Date(c.created_at)
                        return clientDate.getMonth() === date.getMonth() && 
                               clientDate.getFullYear() === date.getFullYear() &&
                               c.status === 'Won' && c.placement_fee
                      }).reduce((sum, c) => sum + (c.placement_fee || 0), 0)
                      last6Months.push({ period: monthName, revenue })
                    }
                    return last6Months
                  })() :
                  (() => {
                    const last30Days = []
                    const now = new Date()
                    for (let i = 29; i >= 0; i--) {
                      const date = new Date(now)
                      date.setDate(date.getDate() - i)
                      const dayName = date.getDate().toString()
                      const revenue = clients.filter(c => {
                        const clientDate = new Date(c.created_at)
                        return clientDate.toDateString() === date.toDateString() &&
                               c.status === 'Won' && c.placement_fee
                      }).reduce((sum, c) => sum + (c.placement_fee || 0), 0)
                      last30Days.push({ period: dayName, revenue })
                    }
                    return last30Days
                  })()
                
                const maxRevenue = Math.max(...trendData.map(m => m.revenue))
                
                return trendData.map(({ period, revenue }) => {
                  const height = maxRevenue > 0 ? (revenue / maxRevenue) * 200 : 0
                  return (
                    <div key={period} className="flex flex-col items-center min-w-0 flex-shrink-0">
                      <div className="mb-2 text-xs text-gray-600">${formatNumber(revenue)}</div>
                      <div 
                        className="w-8 bg-green-500 rounded-t" 
                        style={{ height: `${height}px`, minHeight: '2px' }}
                      ></div>
                      <div className="mt-2 text-xs text-gray-500 transform -rotate-45 origin-left whitespace-nowrap">{period}</div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>

          {/* Placement Status Distribution */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Placement Status Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Active', 'Refunded', 'Lost (Refunded)', 'Lost (No Refund)'].map(status => {
                let startDate = new Date()
                let endDate = new Date()
                if (dateRange.start && dateRange.end) {
                  startDate = new Date(dateRange.start)
                  endDate = new Date(dateRange.end + 'T23:59:59Z')
                } else {
                  startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
                }
                
                const count = clients.filter(c => {
                  const createdDate = new Date(c.created_at)
                  return c.placement_status === status && createdDate >= startDate && createdDate <= endDate
                }).length
                
                const colors = {
                  'Active': 'text-green-600',
                  'Refunded': 'text-yellow-600', 
                  'Lost (Refunded)': 'text-red-600',
                  'Lost (No Refund)': 'text-gray-600'
                }
                
                return (
                  <div key={status} className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className={`text-2xl font-bold ${colors[status as keyof typeof colors]}`}>{count}</p>
                    <p className="text-xs text-gray-600">{status}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Clients Tab */}
      {activeTab === 'clients' && (
        <div className="space-y-6">
          {/* Client KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-50 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Total Clients</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(getFilteredClients().length)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-50 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Won</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(dateRangeData.wonClients)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-red-50 rounded-lg"><XCircle className="w-5 h-5 text-red-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Lost</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(dateRangeData.lostClients)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Win Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{dateRangeData.clientWinRate}%</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-red-50 rounded-lg"><XCircle className="w-5 h-5 text-red-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Loss Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{dateRangeData.clientLossRate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Clients by Status */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Clients by Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Pending', 'Active', 'Won', 'Lost'].map(status => {
                const count = clientStatusData.find(s => s.status === status)?.count || 0
                return (
                  <div key={status} className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-nestalk-primary">{count}</p>
                    <p className="text-xs text-gray-600">{status}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Time & Pipeline Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Avg Time to Won</p>
              <p className="text-2xl font-bold text-green-600">{getAvgTimeToOutcome('Won')} days</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Avg Time to Lost</p>
              <p className="text-2xl font-bold text-red-600">{getAvgTimeToOutcome('Lost')} days</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Pipeline Velocity</p>
              <p className="text-2xl font-bold text-blue-600">{getPipelineVelocity()} days</p>
            </div>
          </div>

          {/* Client Acquisition Trend */}
          <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Acquisition Trend</h3>
            <div className="flex gap-2 md:gap-4 mb-4">
              <button 
                onClick={() => setTrendView('monthly')} 
                className={`px-2 md:px-3 py-1 text-xs md:text-sm rounded ${trendView === 'monthly' ? 'bg-nestalk-primary text-white' : 'bg-gray-100'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setTrendView('daily')} 
                className={`px-2 md:px-3 py-1 text-xs md:text-sm rounded ${trendView === 'daily' ? 'bg-nestalk-primary text-white' : 'bg-gray-100'}`}
              >
                Daily (Last 30)
              </button>
            </div>
            <div className="h-64 flex items-end justify-between px-2 md:px-4 border-b border-l border-gray-200 overflow-x-auto">
              {(trendView === 'monthly' ? getMonthlyTrend() : getDailyTrend()).map(({ period, count }, index) => {
                const maxCount = Math.max(...(trendView === 'monthly' ? getMonthlyTrend() : getDailyTrend()).map(m => m.count))
                const height = maxCount > 0 ? (count / maxCount) * 200 : 0
                return (
                  <div key={period} className="flex flex-col items-center min-w-0 flex-shrink-0">
                    <div className="mb-2 text-xs text-gray-600">{count}</div>
                    <div 
                      className="w-4 md:w-8 bg-nestalk-primary rounded-t" 
                      style={{ height: `${height}px` }}
                    ></div>
                    <div className="mt-2 text-xs text-gray-500 transform -rotate-45 origin-left whitespace-nowrap">{period}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Role Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Most Requested Roles */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Requested Roles</h3>
              <div className="space-y-3">
                {getMostRequestedRoles().map(({ role, count }) => (
                  <div key={role} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{role}</span>
                    <span className="text-lg font-bold text-nestalk-primary">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Role Win Rates */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Win Rates</h3>
              <div className="space-y-3">
                {(() => {
                  const roleWinRates = getRoleWinRates()
                  
                  if (roleWinRates.length === 0) {
                    return (
                      <div className="text-center text-gray-500 py-4">
                        No role win rates available. Need clients with Won/Lost status.
                      </div>
                    )
                  }
                  
                  return roleWinRates.map(({ role, winRate, total }) => (
                    <div key={role} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">{role}</span>
                        <span className="text-sm font-bold text-nestalk-primary">{winRate}%</span>
                      </div>
                      <div className="text-xs text-gray-500">Total: {total}</div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          </div>

          {/* Pipeline Bottlenecks */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Bottlenecks</h3>
            <div className="mb-2 text-xs text-gray-500">* Estimated based on time since creation (not actual status change dates)</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {getPipelineBottlenecks().map(({ status, avgDays, count }) => (
                <div key={status} className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-gray-900">{avgDays}</p>
                  <p className="text-xs text-gray-600">days in {status}</p>
                  <p className="text-xs text-gray-500">({count} clients)</p>
                </div>
              ))}
            </div>
          </div>

          {/* Source Outcomes */}
          <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Source Outcomes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
              {sources.map(source => {
                const sourceClients = getFilteredClients().filter(c => (c.source || 'Other') === source)
                const pending = sourceClients.filter(c => c.status === 'Pending').length
                const active = sourceClients.filter(c => c.status.includes('Active')).length
                const lost = sourceClients.filter(c => c.status.includes('Lost')).length
                const won = sourceClients.filter(c => c.status === 'Won').length
                const total = pending + active + lost + won
                
                if (total === 0) return null
                
                const statusData = [
                  { status: 'Pending', count: pending, color: '#3b82f6' },
                  { status: 'Active', count: active, color: '#f97316' },
                  { status: 'Lost', count: lost, color: '#ef4444' },
                  { status: 'Won', count: won, color: '#10b981' }
                ].filter(d => d.count > 0)
                
                return (
                  <div key={source} className="text-center">
                    <h4 className="font-medium text-gray-900 mb-3 text-sm md:text-base">{source}</h4>
                    <div className="mb-4">
                      <svg width="150" height="150" className="mx-auto md:w-[200px] md:h-[200px]">
                        {statusData.length === 1 ? (
                          <circle cx="75" cy="75" r="60" fill={statusData[0].color} stroke="white" strokeWidth="2" className="md:cx-[100] md:cy-[100] md:r-[80]" />
                        ) : (
                          (() => {
                            let currentAngle = 0
                            return statusData.map((data, index) => {
                              const angle = (data.count / total) * 360
                              const endAngle = currentAngle + angle
                              const largeArcFlag = angle > 180 ? 1 : 0
                              const centerX = 75
                              const centerY = 75
                              const radius = 60
                              const x1 = centerX + radius * Math.cos((currentAngle * Math.PI) / 180)
                              const y1 = centerY + radius * Math.sin((currentAngle * Math.PI) / 180)
                              const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180)
                              const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180)
                              
                              const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
                              currentAngle = endAngle
                              
                              return (
                                <path key={index} d={path} fill={data.color} stroke="white" strokeWidth="2" />
                              )
                            })
                          })()
                        )}
                      </svg>
                    </div>
                    <div className="grid grid-cols-1 gap-1 text-xs px-2">
                      {statusData.map(({ status, count, color }) => (
                        <div key={status} className="flex items-center justify-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                          <span>{status}: {count} ({Math.round((count/total)*100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Lead Distribution by Source */}
          <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Lead Distribution by Source</h3>
            <div className="flex justify-center">
              <div className="text-center">
                <div className="mb-4">
                  <svg width="250" height="250" className="mx-auto md:w-[300px] md:h-[300px]">
                    {(() => {
                      const sourceData = sources.map((source, index) => {
                        const count = getFilteredClients().filter(c => (c.source || 'Other') === source).length
                        const colors = ['#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f59e0b', '#ec4899']
                        return { source, count, color: colors[index % colors.length] }
                      }).filter(d => d.count > 0)
                      
                      const totalLeads = sourceData.reduce((sum, d) => sum + d.count, 0)
                      
                      if (sourceData.length === 1) {
                        return (
                          <circle cx="125" cy="125" r="100" fill={sourceData[0].color} stroke="white" strokeWidth="2" className="md:cx-[150] md:cy-[150] md:r-[120]" />
                        )
                      }
                      
                      let currentAngle = 0
                      return sourceData.map((data, index) => {
                        const angle = (data.count / totalLeads) * 360
                        const endAngle = currentAngle + angle
                        const largeArcFlag = angle > 180 ? 1 : 0
                        const centerX = 125
                        const centerY = 125
                        const radius = 100
                        const x1 = centerX + radius * Math.cos((currentAngle * Math.PI) / 180)
                        const y1 = centerY + radius * Math.sin((currentAngle * Math.PI) / 180)
                        const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180)
                        const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180)
                        
                        const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
                        currentAngle = endAngle
                        
                        return (
                          <path key={index} d={path} fill={data.color} stroke="white" strokeWidth="2" />
                        )
                      })
                    })()}
                  </svg>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm max-w-md mx-auto px-4">
                  {(() => {
                    const sourceData = sources.map((source, index) => {
                      const count = getFilteredClients().filter(c => (c.source || 'Other') === source).length
                      const colors = ['#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f59e0b', '#ec4899']
                      return { source, count, color: colors[index % colors.length] }
                    }).filter(d => d.count > 0)
                    
                    const totalLeads = sourceData.reduce((sum, d) => sum + d.count, 0)
                    
                    return sourceData.map(({ source, count, color }) => (
                      <div key={source} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                        <span>{source}: {count} ({Math.round((count/totalLeads)*100)}%)</span>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Source Win Contribution */}
          <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Source Win Contribution</h3>
            <div className="h-80 flex items-end justify-between px-2 md:px-4 border-b border-l border-gray-200 overflow-x-auto">
              {(() => {
                const totalWins = clients.filter(c => c.status === 'Won').length
                
                return sources.map(source => {
                  const sourceWins = clients.filter(c => (c.source || 'Other') === source && c.status === 'Won').length
                  const contributionRate = totalWins > 0 ? Math.round((sourceWins / totalWins) * 100) : 0
                  const height = contributionRate * 2.5
                  
                  return (
                    <div key={source} className="flex flex-col items-center min-w-0 flex-shrink-0">
                      <div className="mb-2 text-xs text-gray-600">{contributionRate}%</div>
                      <div 
                        className="w-8 md:w-12 bg-nestalk-primary rounded-t" 
                        style={{ height: `${height}px`, minHeight: '2px' }}
                      ></div>
                      <div className="mt-2 text-xs text-gray-700 text-center w-12 md:w-16">
                        <div className="transform -rotate-45 origin-center whitespace-nowrap">{source}</div>
                        <div className="text-gray-500 mt-1">{sourceWins}</div>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
            <div className="mt-4 text-xs md:text-sm text-gray-500 text-center px-2">
              Shows each source's percentage contribution to total wins
            </div>
          </div>

          {/* Source Conversion Leaderboard */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Source Conversion Leaderboard</h3>
            <div className="mb-4 text-sm text-gray-500 text-center">
              Shows win rate efficiency: Won / (Won + Lost) per source
            </div>
            <div className="space-y-4">
              {sources.map(source => {
                const sourceClients = getFilteredClients().filter(c => (c.source || 'Other') === source)
                const won = sourceClients.filter(c => c.status === 'Won').length
                const lost = sourceClients.filter(c => c.status.includes('Lost')).length
                const total = sourceClients.length
                const winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0
                
                if (total === 0) return null
                
                return { source, total, won, lost, winRate }
              }).filter(Boolean).sort((a, b) => b.winRate - a.winRate).map(({ source, total, won, lost, winRate }, index) => (
                <div key={source} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-nestalk-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <h4 className="font-semibold text-gray-900">{source}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-nestalk-primary">{winRate}%</div>
                      <div className="text-xs text-gray-500">Win Rate</div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Won vs Lost Progress</span>
                      <span>{won} won, {lost} lost of {total} total</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div className="h-full flex">
                        <div 
                          className="bg-green-500" 
                          style={{ width: `${total > 0 ? (won / total) * 100 : 0}%` }}
                        ></div>
                        <div 
                          className="bg-red-500" 
                          style={{ width: `${total > 0 ? (lost / total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-green-700">Won: {won}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-red-700">Lost: {lost}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <span className="text-gray-600">Pending: {total - won - lost}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Candidates Tab */}
      {activeTab === 'candidates' && (
        <div className="space-y-6">
          {/* Candidate KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-50 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(getFilteredCandidates().length)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-50 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Won</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(dateRangeData.wonCandidates)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-red-50 rounded-lg"><XCircle className="w-5 h-5 text-red-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Lost</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(dateRangeData.lostCandidates)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-50 rounded-lg"><Calendar className="w-5 h-5 text-yellow-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Interviewed</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(candidates.filter(c => c.status === 'INTERVIEW_SCHEDULED').length)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-orange-50 rounded-lg"><RefreshCcw className="w-5 h-5 text-orange-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Rescheduled</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(candidates.filter(c => c.status === 'RESCHEDULED').length)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-purple-50 rounded-lg"><RefreshCcw className="w-5 h-5 text-purple-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Reschedule Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{(() => {
                    const interviewed = candidates.filter(c => c.status === 'INTERVIEW_SCHEDULED').length
                    const rescheduled = candidates.filter(c => c.status === 'RESCHEDULED').length
                    const total = interviewed + rescheduled
                    return total > 0 ? Math.round((rescheduled / total) * 100) : 0
                  })()}%</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Win Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{dateRangeData.candidateWinRate}%</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-red-50 rounded-lg"><XCircle className="w-5 h-5 text-red-600" /></div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Loss Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{dateRangeData.candidateLossRate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Candidates by Status */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Candidates by Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {['PENDING', 'INTERVIEW_SCHEDULED', 'RESCHEDULED', 'WON', 'LOST'].map(status => {
                const count = candidateStatusData.find(s => s.status === status)?.count || 0
                return (
                  <div key={status} className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-nestalk-primary">{count}</p>
                    <p className="text-xs text-gray-600">{status.replace('_', ' ')}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Candidate Acquisition Trend */}
          <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Candidate Acquisition Trend</h3>
            <div className="flex gap-2 md:gap-4 mb-4">
              <button 
                onClick={() => setTrendView('monthly')} 
                className={`px-2 md:px-3 py-1 text-xs md:text-sm rounded ${trendView === 'monthly' ? 'bg-nestalk-primary text-white' : 'bg-gray-100'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setTrendView('daily')} 
                className={`px-2 md:px-3 py-1 text-xs md:text-sm rounded ${trendView === 'daily' ? 'bg-nestalk-primary text-white' : 'bg-gray-100'}`}
              >
                Daily (Last 30)
              </button>
            </div>
            <div className="h-64 flex items-end justify-between px-2 md:px-4 border-b border-l border-gray-200 overflow-x-auto">
              {(() => {
                const trendData = trendView === 'monthly' ? 
                  (() => {
                    const last6Months = []
                    const now = new Date()
                    for (let i = 5; i >= 0; i--) {
                      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
                      const monthName = date.toLocaleDateString('en-US', { month: 'short' })
                      const count = candidates.filter(c => {
                        const candidateDate = new Date(c.created_at)
                        return candidateDate.getMonth() === date.getMonth() && candidateDate.getFullYear() === date.getFullYear()
                      }).length
                      last6Months.push({ period: monthName, count })
                    }
                    return last6Months
                  })() :
                  (() => {
                    const last30Days = []
                    const now = new Date()
                    for (let i = 29; i >= 0; i--) {
                      const date = new Date(now)
                      date.setDate(date.getDate() - i)
                      const dayName = date.getDate().toString()
                      const count = candidates.filter(c => {
                        const candidateDate = new Date(c.created_at)
                        return candidateDate.toDateString() === date.toDateString()
                      }).length
                      last30Days.push({ period: dayName, count })
                    }
                    return last30Days
                  })()
                
                const maxCount = Math.max(...trendData.map(m => m.count))
                
                return trendData.map(({ period, count }) => {
                  const height = maxCount > 0 ? (count / maxCount) * 200 : 0
                  return (
                    <div key={period} className="flex flex-col items-center min-w-0 flex-shrink-0">
                      <div className="mb-2 text-xs text-gray-600">{count}</div>
                      <div 
                        className="w-4 md:w-8 bg-nestalk-primary rounded-t" 
                        style={{ height: `${height}px` }}
                      ></div>
                      <div className="mt-2 text-xs text-gray-500 transform -rotate-45 origin-left whitespace-nowrap">{period}</div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>

          {/* Pipeline Bottlenecks */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Bottlenecks</h3>
            <div className="mb-2 text-xs text-gray-500">* Estimated based on time since creation</div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {['PENDING', 'INTERVIEW_SCHEDULED', 'RESCHEDULED', 'WON', 'LOST'].map(status => {
                const statusCandidates = candidates.filter(c => c.status === status)
                const count = statusCandidates.length
                
                const avgDays = count > 0 ? Math.round(
                  statusCandidates.reduce((sum, candidate) => {
                    const created = new Date(candidate.created_at)
                    const now = new Date()
                    const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
                    return sum + days
                  }, 0) / count
                ) : 0
                
                return (
                  <div key={status} className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-lg font-bold text-gray-900">{avgDays}</p>
                    <p className="text-xs text-gray-600">days in {status.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-500">({count} candidates)</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Lead Distribution by Source */}
          <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Lead Distribution by Source</h3>
            <div className="flex justify-center">
              <div className="text-center">
                <div className="mb-4">
                  <svg width="250" height="250" className="mx-auto md:w-[300px] md:h-[300px]">
                    {(() => {
                      const sourceData = sources.map((source, index) => {
                        const count = getFilteredCandidates().filter(c => (c.source || 'Other') === source).length
                        const colors = ['#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f59e0b', '#ec4899']
                        return { source, count, color: colors[index % colors.length] }
                      }).filter(d => d.count > 0)
                      
                      const totalLeads = sourceData.reduce((sum, d) => sum + d.count, 0)
                      
                      if (sourceData.length === 1) {
                        return (
                          <circle cx="125" cy="125" r="100" fill={sourceData[0].color} stroke="white" strokeWidth="2" className="md:cx-[150] md:cy-[150] md:r-[120]" />
                        )
                      }
                      
                      let currentAngle = 0
                      return sourceData.map((data, index) => {
                        const angle = (data.count / totalLeads) * 360
                        const endAngle = currentAngle + angle
                        const largeArcFlag = angle > 180 ? 1 : 0
                        const centerX = 125
                        const centerY = 125
                        const radius = 100
                        const x1 = centerX + radius * Math.cos((currentAngle * Math.PI) / 180)
                        const y1 = centerY + radius * Math.sin((currentAngle * Math.PI) / 180)
                        const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180)
                        const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180)
                        
                        const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
                        currentAngle = endAngle
                        
                        return (
                          <path key={index} d={path} fill={data.color} stroke="white" strokeWidth="2" />
                        )
                      })
                    })()}
                  </svg>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm max-w-md mx-auto px-4">
                  {(() => {
                    const sourceData = sources.map((source, index) => {
                      const count = getFilteredCandidates().filter(c => (c.source || 'Other') === source).length
                      const colors = ['#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f59e0b', '#ec4899']
                      return { source, count, color: colors[index % colors.length] }
                    }).filter(d => d.count > 0)
                    
                    const totalLeads = sourceData.reduce((sum, d) => sum + d.count, 0)
                    
                    return sourceData.map(({ source, count, color }) => (
                      <div key={source} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                        <span>{source}: {count} ({Math.round((count/totalLeads)*100)}%)</span>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </div>
          </div>



          {/* Source Outcomes */}
          <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Source Outcomes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
              {sources.map(source => {
                const sourceCandidates = getFilteredCandidates().filter(c => (c.source || 'Other') === source)
                const pending = sourceCandidates.filter(c => c.status === 'PENDING').length
                const interviewed = sourceCandidates.filter(c => c.status === 'INTERVIEW_SCHEDULED').length
                const rescheduled = sourceCandidates.filter(c => c.status === 'RESCHEDULED').length
                const lost = sourceCandidates.filter(c => c.status === 'LOST').length
                const won = sourceCandidates.filter(c => c.status === 'WON').length
                const total = pending + interviewed + rescheduled + lost + won
                
                if (total === 0) return null
                
                const statusData = [
                  { status: 'Pending', count: pending, color: '#3b82f6' },
                  { status: 'Interviewed', count: interviewed, color: '#f97316' },
                  { status: 'Rescheduled', count: rescheduled, color: '#f59e0b' },
                  { status: 'Lost', count: lost, color: '#ef4444' },
                  { status: 'Won', count: won, color: '#10b981' }
                ].filter(d => d.count > 0)
                
                return (
                  <div key={source} className="text-center">
                    <h4 className="font-medium text-gray-900 mb-3 text-sm md:text-base">{source}</h4>
                    <div className="mb-4">
                      <svg width="150" height="150" className="mx-auto md:w-[200px] md:h-[200px]">
                        {statusData.length === 1 ? (
                          <circle cx="75" cy="75" r="60" fill={statusData[0].color} stroke="white" strokeWidth="2" className="md:cx-[100] md:cy-[100] md:r-[80]" />
                        ) : (
                          (() => {
                            let currentAngle = 0
                            return statusData.map((data, index) => {
                              const angle = (data.count / total) * 360
                              const endAngle = currentAngle + angle
                              const largeArcFlag = angle > 180 ? 1 : 0
                              const centerX = 75
                              const centerY = 75
                              const radius = 60
                              const x1 = centerX + radius * Math.cos((currentAngle * Math.PI) / 180)
                              const y1 = centerY + radius * Math.sin((currentAngle * Math.PI) / 180)
                              const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180)
                              const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180)
                              
                              const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
                              currentAngle = endAngle
                              
                              return (
                                <path key={index} d={path} fill={data.color} stroke="white" strokeWidth="2" />
                              )
                            })
                          })()
                        )}
                      </svg>
                    </div>
                    <div className="grid grid-cols-1 gap-1 text-xs px-2">
                      {statusData.map(({ status, count, color }) => (
                        <div key={status} className="flex items-center justify-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                          <span>{status}: {count} ({Math.round((count/total)*100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Source Win Contribution */}
          <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Source Win Contribution</h3>
            <div className="h-80 flex items-end justify-between px-2 md:px-4 border-b border-l border-gray-200 overflow-x-auto">
              {(() => {
                const totalWins = candidates.filter(c => c.status === 'WON').length
                
                return sources.map(source => {
                  const sourceWins = candidates.filter(c => (c.source || 'Other') === source && c.status === 'WON').length
                  const contributionRate = totalWins > 0 ? Math.round((sourceWins / totalWins) * 100) : 0
                  const height = contributionRate * 2.5
                  
                  return (
                    <div key={source} className="flex flex-col items-center min-w-0 flex-shrink-0">
                      <div className="mb-2 text-xs text-gray-600">{contributionRate}%</div>
                      <div 
                        className="w-8 md:w-12 bg-nestalk-primary rounded-t" 
                        style={{ height: `${height}px`, minHeight: '2px' }}
                      ></div>
                      <div className="mt-2 text-xs text-gray-700 text-center w-12 md:w-16">
                        <div className="transform -rotate-45 origin-center whitespace-nowrap">{source}</div>
                        <div className="text-gray-500 mt-1">{sourceWins}</div>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
            <div className="mt-4 text-xs md:text-sm text-gray-500 text-center px-2">
              Shows each source's percentage contribution to total candidate wins
            </div>
          </div>

          {/* Role Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Most Applied Roles */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Applied Roles</h3>
              <div className="space-y-3">
                {(() => {
                  const roleCounts = candidates.reduce((acc, c) => {
                    acc[c.role] = (acc[c.role] || 0) + 1
                    return acc
                  }, {} as Record<string, number>)
                  
                  return Object.entries(roleCounts)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">{role}</span>
                        <span className="text-lg font-bold text-nestalk-primary">{count}</span>
                      </div>
                    ))
                })()}
              </div>
            </div>

            {/* Role Win Rates */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Win Rates</h3>
              <div className="space-y-3">
                {(() => {
                  const roleStats = candidates.reduce((acc, c) => {
                    const role = c.role
                    if (!acc[role]) acc[role] = { total: 0, won: 0, lost: 0 }
                    acc[role].total++
                    if (c.status === 'WON') acc[role].won++
                    if (c.status === 'LOST') acc[role].lost++
                    return acc
                  }, {} as Record<string, { total: number, won: number, lost: number }>)
                  
                  const roleWinRates = Object.entries(roleStats)
                    .filter(([, stats]) => (stats.won + stats.lost) > 0)
                    .map(([role, stats]) => ({
                      role,
                      total: stats.total,
                      winRate: Math.round((stats.won / (stats.won + stats.lost)) * 100)
                    }))
                    .sort((a, b) => b.winRate - a.winRate)
                    .slice(0, 5)
                  
                  if (roleWinRates.length === 0) {
                    return (
                      <div className="text-center text-gray-500 py-4">
                        No role win rates available. Need candidates with WON/LOST status.
                      </div>
                    )
                  }
                  
                  return roleWinRates.map(({ role, winRate, total }) => (
                    <div key={role} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">{role}</span>
                        <span className="text-sm font-bold text-nestalk-primary">{winRate}%</span>
                      </div>
                      <div className="text-xs text-gray-500">Total: {total}</div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          </div>

          {/* Source Conversion Leaderboard */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Source Conversion Leaderboard</h3>
            <div className="mb-4 text-sm text-gray-500 text-center">
              Shows win rate efficiency: WON / (WON + LOST) per source
            </div>
            <div className="space-y-4">
              {sources.map(source => {
                const sourceCandidates = getFilteredCandidates().filter(c => (c.source || 'Other') === source)
                const won = sourceCandidates.filter(c => c.status === 'WON').length
                const lost = sourceCandidates.filter(c => c.status === 'LOST').length
                const total = sourceCandidates.length
                const winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0
                
                if (total === 0) return null
                
                return { source, total, won, lost, winRate }
              }).filter(Boolean).sort((a, b) => b.winRate - a.winRate).map(({ source, total, won, lost, winRate }, index) => (
                <div key={source} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-nestalk-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <h4 className="font-semibold text-gray-900">{source}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-nestalk-primary">{winRate}%</div>
                      <div className="text-xs text-gray-500">Win Rate</div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Won vs Lost Progress</span>
                      <span>{won} won, {lost} lost of {total} total</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div className="h-full flex">
                        <div 
                          className="bg-green-500" 
                          style={{ width: `${total > 0 ? (won / total) * 100 : 0}%` }}
                        ></div>
                        <div 
                          className="bg-red-500" 
                          style={{ width: `${total > 0 ? (lost / total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-green-700">Won: {won}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-red-700">Lost: {lost}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <span className="text-gray-600">Pending: {total - won - lost}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}