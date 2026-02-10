import React from 'react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Users, Building2, Calendar, Clock, MessageCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalClients: 0,
    totalLeads: 0,
    activeClients: 0,
    wonClients: 0,
    lostClients: 0,
    pendingClients: 0,
    clientsThisMonth: 0,
    interviewWon: 0,
    winRate: 0,
    interviewConversion: 0,
    pendingPipeline: 0,
    qualificationRate: 0,
    activeCandidates: 0,
    wonCandidates: 0,
    lostCandidates: 0,
    candidatesThisMonth: 0,
    todayInterviews: 0,
  })
  const [dateRange, setDateRange] = useState({
    startDate: new Date().getFullYear() + '-01-01',
    endDate: new Date().getFullYear() + '-12-31'
  })
  const [showAllTime, setShowAllTime] = useState(false)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [placementFollowups, setPlacementFollowups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
    
    // Set up real-time subscriptions
    const candidatesSubscription = supabase
      .channel('dashboard-candidates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => {
        loadDashboardData()
      })
      .subscribe()
    
    const clientsSubscription = supabase
      .channel('dashboard-clients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        loadDashboardData()
      })
      .subscribe()
    
    const interviewsSubscription = supabase
      .channel('dashboard-interviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews' }, () => {
        loadDashboardData()
      })
      .subscribe()
    
    const activitySubscription = supabase
      .channel('dashboard-activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
        loadDashboardData()
      })
      .subscribe()
    
    return () => {
      candidatesSubscription.unsubscribe()
      clientsSubscription.unsubscribe()
      interviewsSubscription.unsubscribe()
      activitySubscription.unsubscribe()
    }
  }, [dateRange, showAllTime])

  const loadDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      let startDate, endDate
      
      if (showAllTime) {
        startDate = '1900-01-01T00:00:00'
        endDate = '2099-12-31T23:59:59'
      } else {
        startDate = dateRange.startDate + 'T00:00:00'
        endDate = dateRange.endDate + 'T23:59:59'
      }

      const thisMonth = new Date().toISOString().slice(0, 7) + '-01T00:00:00'
      
      // Load all clients data for calculations
      const { data: allClients } = await supabase.from('clients').select('*')
      const { data: allCandidates } = await supabase.from('candidates').select('*')
      
      // Client status definitions
      const clientStatuses = ['Active', 'Won', 'Lost - Disappointed With Profiles', 'Lost - Conflict of Interest', 'Lost - Competition']
      const lostClientStatuses = ['Lost - Disappointed With Profiles', 'Lost - Conflict of Interest', 'Lost - Competition']
      
      const totalClients = allClients?.filter(c => clientStatuses.includes(c.status)).length || 0
      const totalLeads = allClients?.length || 0
      const activeClients = allClients?.filter(c => c.status?.startsWith('Active')).length || 0
      const wonClients = allClients?.filter(c => c.status === 'Won').length || 0
      const lostClients = allClients?.filter(c => lostClientStatuses.includes(c.status)).length || 0
      const pendingClients = allClients?.filter(c => c.status?.startsWith('Pending')).length || 0
      const clientsThisMonth = allClients?.filter(c => new Date(c.created_at) >= new Date(thisMonth)).length || 0
      
      // Interview metrics
      const interviewWon = allCandidates?.filter(c => c.status === 'WON' && c.scheduled_date).length || 0
      const totalScheduled = allCandidates?.filter(c => c.scheduled_date).length || 0
      const winRate = totalClients > 0 ? Math.round((wonClients / totalClients) * 100) : 0
      const interviewConversion = totalScheduled > 0 ? Math.round((interviewWon / totalScheduled) * 100) : 0
      const pendingPipeline = allClients?.filter(c => ['Pending', 'Budget'].includes(c.status)).length || 0
      const qualificationRate = totalLeads > 0 ? Math.round((totalClients / totalLeads) * 100) : 0
      
      // Load remaining stats
      const [
        candidatesCount,
        activeCandidatesCount,
        wonCandidatesCount,
        lostCandidatesCount,
        candidatesThisMonthCount,
        todayInterviewsCount
      ] = await Promise.all([
        supabase.from('candidates').select('id', { count: 'exact', head: true }),
        supabase.from('candidates').select('id', { count: 'exact', head: true }).in('status', ['Available', 'In Process', 'Interview Scheduled']),
        supabase.from('candidates').select('id', { count: 'exact', head: true }).eq('status', 'WON'),
        supabase.from('candidates').select('id', { count: 'exact', head: true }).like('status', 'Lost%'),
        supabase.from('candidates').select('id', { count: 'exact', head: true }).gte('created_at', thisMonth),
        supabase.from('interviews').select('id', { count: 'exact', head: true }).gte('date_time', today + 'T00:00:00').lt('date_time', today + 'T23:59:59')
      ])
      
      setStats({
        totalCandidates: candidatesCount.count || 0,
        totalClients,
        totalLeads,
        activeClients,
        wonClients,
        lostClients,
        pendingClients,
        clientsThisMonth,
        interviewWon,
        winRate,
        interviewConversion,
        pendingPipeline,
        qualificationRate,
        activeCandidates: activeCandidatesCount.count || 0,
        wonCandidates: wonCandidatesCount.count || 0,
        lostCandidates: lostCandidatesCount.count || 0,
        candidatesThisMonth: candidatesThisMonthCount.count || 0,
        todayInterviews: todayInterviewsCount.count || 0
      })

      // Load recent activity from activity_logs table
      const { data: activityLogs } = await supabase
        .from('activity_logs')
        .select(`
          *,
          staff:user_id (name, username)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      // Load placement follow-ups that are due or overdue
      const { data: followups } = await supabase
        .from('placement_followups')
        .select(`
          *,
          placements(
            candidates(name),
            clients(name)
          )
        `)
        .is('completed_date', null)
        .lte('due_date', new Date().toISOString().split('T')[0])
        .limit(5)

      setRecentActivity(activityLogs || [])
      setPlacementFollowups(followups || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Date range change handler
  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [type === 'start' ? 'startDate' : 'endDate']: value
    }))
  }

  const handleAllTimeToggle = () => {
    setShowAllTime(!showAllTime)
    if (!showAllTime) {
      // Reset to current year when switching to all time
      setDateRange({
        startDate: new Date().getFullYear() + '-01-01',
        endDate: new Date().getFullYear() + '-12-31'
      })
    }
  }

  const statCards = [
    // Client Cards (12)
    {
      name: 'Total Leads',
      value: stats.totalLeads,
      icon: Building2,
      color: 'bg-slate-500',
      href: '/clients',
    },
    {
      name: 'Total Clients',
      value: stats.totalClients,
      icon: Building2,
      color: 'bg-blue-500',
      href: '/clients',
    },
    {
      name: 'Active Clients',
      value: stats.activeClients,
      icon: Building2,
      color: 'bg-green-500',
      href: '/clients',
    },
    {
      name: 'Won Clients',
      value: stats.wonClients,
      icon: Building2,
      color: 'bg-emerald-500',
      href: '/clients',
    },
    {
      name: 'Lost Clients',
      value: stats.lostClients,
      icon: Building2,
      color: 'bg-red-500',
      href: '/clients',
    },
    {
      name: 'Pending Clients',
      value: stats.pendingClients,
      icon: Building2,
      color: 'bg-yellow-500',
      href: '/clients',
    },
    {
      name: 'Interview Won',
      value: stats.interviewWon,
      icon: Building2,
      color: 'bg-teal-500',
      href: '/clients',
    },
    {
      name: 'Win Rate',
      value: `${stats.winRate}%`,
      icon: Building2,
      color: 'bg-indigo-500',
      href: '/clients',
    },
    {
      name: 'Interview Conversion',
      value: `${stats.interviewConversion}%`,
      icon: Building2,
      color: 'bg-cyan-500',
      href: '/clients',
    },
    {
      name: 'Pending Pipeline',
      value: stats.pendingPipeline,
      icon: Building2,
      color: 'bg-amber-500',
      href: '/clients',
    },
    {
      name: 'Qualification Rate',
      value: `${stats.qualificationRate}%`,
      icon: Building2,
      color: 'bg-rose-500',
      href: '/clients',
    },
    {
      name: 'Clients This Month',
      value: stats.clientsThisMonth,
      icon: Building2,
      color: 'bg-purple-500',
      href: '/clients',
    },
    // Candidate Cards (5)
    {
      name: 'Total Candidates',
      value: stats.totalCandidates,
      icon: Users,
      color: 'bg-blue-500',
      href: '/candidates',
    },
    {
      name: 'Active Candidates',
      value: stats.activeCandidates,
      icon: Users,
      color: 'bg-green-500',
      href: '/candidates',
    },
    {
      name: 'Won Candidates',
      value: stats.wonCandidates,
      icon: Users,
      color: 'bg-emerald-500',
      href: '/candidates',
    },
    {
      name: 'Lost Candidates',
      value: stats.lostCandidates,
      icon: Users,
      color: 'bg-red-500',
      href: '/candidates',
    },
    {
      name: 'Candidates This Month',
      value: stats.candidatesThisMonth,
      icon: Users,
      color: 'bg-purple-500',
      href: '/candidates',
    },
    {
      name: "Today's Interviews",
      value: stats.todayInterviews,
      icon: Calendar,
      color: 'bg-orange-500',
      href: '/interviews',
    },
  ]

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return '1 day ago'
    return `${diffInDays} days ago`
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow h-24"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your team activity overview.</p>
      </div>

      {/* Stats Cards */}
      {/* Date Range Selector */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showAllTime}
              onChange={handleAllTimeToggle}
              className="rounded border-gray-300 text-nestalk-primary focus:ring-nestalk-primary"
            />
            <span className="text-sm text-gray-700 font-medium">All Time</span>
          </label>
        </div>
        
        {!showAllTime && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 min-w-0 flex-shrink-0">From:</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 min-w-0 flex-shrink-0">To:</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto"
              />
            </div>
          </>
        )}
        
        {showAllTime && (
          <span className="text-sm text-gray-500 italic">Showing data for all time periods</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <button
            key={card.name}
            onClick={() => navigate(card.href)}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left w-full"
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${card.color}`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{card.name}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Placement Follow-ups */}
        {placementFollowups.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center">
                <MessageCircle className="w-5 h-5 text-red-400" />
                <h2 className="ml-2 text-lg font-semibold text-gray-900">Placement Follow-ups Due</h2>
                <button
                  onClick={() => navigate('/placements')}
                  className="ml-auto text-sm text-nestalk-primary hover:text-nestalk-primary/80"
                >
                  View All
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {placementFollowups.map((followup) => {
                  const isOverdue = new Date(followup.due_date) < new Date()
                  const candidateName = followup.placements?.candidates?.name || 'Unknown'
                  const clientName = followup.placements?.clients?.name || 'Unknown'
                  
                  return (
                    <div key={followup.id} className={`flex items-start space-x-3 p-3 rounded-lg ${
                      isOverdue ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <div className="flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          isOverdue ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {clientName} - {candidateName}
                        </p>
                        <p className="text-xs text-gray-600">
                          {followup.followup_type === '2_week' ? '2-week' : 'Monthly'} check - {isOverdue ? 'OVERDUE' : 'DUE TODAY'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {new Date(followup.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-gray-400" />
              <h2 className="ml-2 text-lg font-semibold text-gray-900">Recent Activity</h2>
              {recentActivity.length > 0 && (
                <button
                  onClick={() => navigate('/updates')}
                  className="ml-auto text-sm text-nestalk-primary hover:text-nestalk-primary/80"
                >
                  View All
                </button>
              )}
            </div>
          </div>
          <div className="p-6">
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.action_type === 'status_change' ? 'bg-blue-500' :
                        activity.action_type === 'edit' ? 'bg-yellow-500' :
                        activity.action_type === 'create' ? 'bg-green-500' :
                        activity.action_type === 'reschedule' ? 'bg-purple-500' :
                        activity.action_type === 'bulk_upload' ? 'bg-indigo-500' :
                        'bg-gray-400'
                      }`}></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(activity.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}