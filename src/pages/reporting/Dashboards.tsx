import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { BarChart3, TrendingUp, Calendar, Filter, Users, Clock, CheckCircle, XCircle, RefreshCcw } from 'lucide-react'

interface KPIRecord {
  id: string
  role: string
  kpi_name: string
  actual_value: number
  variance: number
  rag_status: string
  recorded_at: string
}

interface KPITarget {
  role: string
  kpi_name: string
  target_value: number
  unit: string
}

interface ChartData {
  name: string
  actual: number
  target: number
  rag: string
}

interface CandidateAgg {
  totalAdded: number
  totalScheduled: number
  totalLost: number
}

interface InterviewAgg {
  total: number
  won: number
  lost: number
  rescheduled: number
}

export function Dashboards() {
  const [records, setRecords] = useState<KPIRecord[]>([])
  const [targets, setTargets] = useState<KPITarget[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [roles, setRoles] = useState<string[]>([])

  // recruitment aggregates
  const [candidateAgg, setCandidateAgg] = useState<CandidateAgg>({ totalAdded: 0, totalScheduled: 0, totalLost: 0 })
  const [interviewAgg, setInterviewAgg] = useState<InterviewAgg>({ total: 0, won: 0, lost: 0, rescheduled: 0 })

  useEffect(() => {
    Promise.all([loadRecords(), loadTargets(), loadRecruitmentAgg()])
  }, [])

  useEffect(() => {
    // reload aggregates when filters change
    loadRecruitmentAgg()
  }, [dateRange])

  const loadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('kpi_records')
        .select('*')
        .order('recorded_at', { ascending: false })

      if (error) throw error

      const uniqueRoles = [...new Set(data?.map(record => record.role) || [])]
      setRoles(uniqueRoles)
      setRecords(data || [])
    } catch (error) {
      console.error('Error loading KPI records:', error)
    }
  }

  const loadTargets = async () => {
    try {
      const { data, error } = await supabase
        .from('kpi_targets')
        .select('*')

      if (error) throw error
      setTargets(data || [])
    } catch (error) {
      console.error('Error loading KPI targets:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecruitmentAgg = async () => {
    try {
      // candidates
      let candQuery = supabase.from('candidates').select('id, status, created_at, scheduled_date')
      // interviews
      let intvQuery = supabase.from('interviews').select('id, date_time, created_at, attended, outcome')

      if (dateRange.start && dateRange.end) {
        candQuery = candQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end + 'T23:59:59Z') as any
        intvQuery = intvQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end + 'T23:59:59Z') as any
      }

      const [{ data: candData, error: candErr }, { data: intvData, error: intvErr }] = await Promise.all([
        candQuery,
        intvQuery,
      ])
      if (candErr) throw candErr
      if (intvErr) throw intvErr

      const totalAdded = candData?.length || 0
      const totalScheduled = candData?.filter(c => c.status === 'INTERVIEW_SCHEDULED').length || 0
      const totalLost = candData?.filter(c => c.status === 'LOST').length || 0

      const total = intvData?.length || 0
      const won = intvData?.filter(i => i.attended && i.outcome === 'Won').length || 0
      const lost = intvData?.filter(i => i.attended && i.outcome === 'Lost').length || 0

      // rescheduled: heuristic = interviews with attended=false and outcome=null but created_at != latest for candidate? Simpler: count interviews updated recently or compare date_time vs created_at
      const rescheduled = intvData?.filter(i => !i.attended && !i.outcome && new Date(i.created_at).getTime() !== new Date(i.date_time).getTime()).length || 0

      setCandidateAgg({ totalAdded, totalScheduled, totalLost })
      setInterviewAgg({ total, won, lost, rescheduled })
    } catch (error) {
      console.error('Error loading recruitment aggregates:', error)
    }
  }

  const getFilteredRecords = () => {
    let filtered = records

    if (selectedRole !== 'all') {
      filtered = filtered.filter(record => record.role === selectedRole)
    }

    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.recorded_at).toISOString().split('T')[0]
        return recordDate >= dateRange.start && recordDate <= dateRange.end
      })
    }

    return filtered
  }

  const getRevenueGrowthData = () => {
    const filteredRecords = getFilteredRecords()
    const revenueRecords = filteredRecords.filter(record => 
      record.kpi_name.toLowerCase().includes('revenue')
    )

    const monthlyData = revenueRecords.reduce((acc, record) => {
      const month = new Date(record.recorded_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      })
      
      if (!acc[month]) acc[month] = []
      acc[month].push(record.actual_value)
      return acc
    }, {} as Record<string, number[]>)

    return Object.entries(monthlyData)
      .map(([month, values]) => ({
        month,
        revenue: values.reduce((sum, val) => sum + val, 0) / values.length
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
  }

  const getActualVsTargetData = (): ChartData[] => {
    const filteredRecords = getFilteredRecords()
    
    const kpiData = filteredRecords.reduce((acc, record) => {
      const key = `${record.role}-${record.kpi_name}`
      if (!acc[key]) {
        const target = targets.find(t => t.role === record.role && t.kpi_name === record.kpi_name)
        acc[key] = {
          name: record.kpi_name,
          actual: record.actual_value,
          target: target?.target_value || 0,
          rag: record.rag_status,
          count: 1 as any
        }
      } else {
        ;(acc[key] as any).actual = ((acc[key] as any).actual * (acc[key] as any).count + record.actual_value) / ((acc[key] as any).count + 1)
        ;(acc[key] as any).count++
      }
      return acc
    }, {} as Record<string, ChartData & { count: number }>)

    return Object.values(kpiData).map(({ count, ...data }) => data)
  }

  const getRAGHeatmapData = () => {
    const filteredRecords = getFilteredRecords()
    
    const heatmapData = filteredRecords.reduce((acc, record) => {
      const key = `${record.role}-${record.kpi_name}`
      if (!acc[key]) {
        acc[key] = {
          role: record.role,
          kpi: record.kpi_name,
          green: 0,
          amber: 0,
          red: 0,
          total: 0
        }
      }
      
      acc[key][record.rag_status.toLowerCase() as 'green' | 'amber' | 'red']++
      acc[key].total++
      return acc
    }, {} as Record<string, any>)

    return Object.values(heatmapData)
  }

  const revenueData = getRevenueGrowthData()
  const actualVsTargetData = getActualVsTargetData()
  const heatmapData = getRAGHeatmapData()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nestalk-primary"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
          >
            <option value="all">All Roles</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Recruitment KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Candidates Added</p>
              <p className="text-2xl font-bold text-gray-900">{candidateAgg.totalAdded}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-50 rounded-lg"><Calendar className="w-5 h-5 text-purple-600" /></div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Interview Scheduled</p>
              <p className="text-2xl font-bold text-gray-900">{candidateAgg.totalScheduled}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-50 rounded-lg"><XCircle className="w-5 h-5 text-red-600" /></div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Candidates Lost</p>
              <p className="text-2xl font-bold text-gray-900">{candidateAgg.totalLost}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Interviews Won</p>
              <p className="text-2xl font-bold text-gray-900">{interviewAgg.won}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-50 rounded-lg"><RefreshCcw className="w-5 h-5 text-yellow-600" /></div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Interviews Rescheduled</p>
              <p className="text-2xl font-bold text-gray-900">{interviewAgg.rescheduled}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Existing dashboards remain below */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Growth Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Revenue Growth (Month over Month)</h3>
          </div>
          
          {revenueData.length > 0 ? (
            <div className="space-y-3">
              {revenueData.map((data, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">{data.month}</span>
                  <span className="text-lg font-bold text-green-600">
                    KES {data.revenue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p>No revenue data available</p>
            </div>
          )}
        </div>

        {/* Actual vs Target Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Actual vs Target Performance</h3>
          </div>
          
          {actualVsTargetData.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {actualVsTargetData.map((data, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{data.name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      data.rag === 'Green' ? 'bg-green-100 text-green-800' :
                      data.rag === 'Amber' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {data.rag}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div>
                      <span className="text-gray-500">Actual: </span>
                      <span className="font-medium">{data.actual.toFixed(1)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Target: </span>
                      <span className="font-medium">{data.target}</span>
                    </div>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        data.rag === 'Green' ? 'bg-green-500' :
                        data.rag === 'Amber' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((data.actual / data.target) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p>No performance data available</p>
            </div>
          )}
        </div>

        {/* RAG Status Heatmap */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
          <div className="flex items-center mb-4">
            <Calendar className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">KPI Performance Heatmap</h3>
          </div>
          
          {heatmapData.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {heatmapData.map((data, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="text-sm font-medium text-gray-900 mb-2">
                      {data.role} - {data.kpi}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Green</span>
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${(data.green / data.total) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium">{data.green}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Amber</span>
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full"
                              style={{ width: `${(data.amber / data.total) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium">{data.amber}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Red</span>
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full"
                              style={{ width: `${(data.red / data.total) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium">{data.red}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p>No heatmap data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-900">Green KPIs</p>
              <p className="text-2xl font-bold text-green-600">
                {getFilteredRecords().filter(r => r.rag_status === 'Green').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-900">Amber KPIs</p>
              <p className="text-2xl font-bold text-yellow-600">
                {getFilteredRecords().filter(r => r.rag_status === 'Amber').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-900">Red KPIs</p>
              <p className="text-2xl font-bold text-red-600">
                {getFilteredRecords().filter(r => r.rag_status === 'Red').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-900">Total Records</p>
              <p className="text-2xl font-bold text-blue-600">
                {getFilteredRecords().length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}