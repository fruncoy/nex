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
    activeClients: 0,
    wonClients: 0,
    lostClients: 0,
    pendingClients: 0,
    clientsThisMonth: 0,
    activeCandidates: 0,
    wonCandidates: 0,
    lostCandidates: 0,
    candidatesThisMonth: 0,
    todayInterviews: 0,
  })
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
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
  }, [dateRange])

  const loadDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const startDate = dateRange.startDate + 'T00:00:00'
      const endDate = dateRange.endDate + 'T23:59:59'

      const thisMonth = new Date().toISOString().slice(0, 7) + '-01T00:00:00'
      
      // Load stats
      const [
        candidatesCount,
        clientsCount,
        activeClientsCount,
        wonClientsCount,
        lostClientsCount,
        pendingClientsCount,
        clientsThisMonthCount,
        activeCandidatesCount,
        wonCandidatesCount,
        lostCandidatesCount,
        candidatesThisMonthCount,
        todayInterviewsCount
      ] = await Promise.all([
        supabase.from('candidates').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('id', { count: 'exact', head: true }).like('status', 'Active%'),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'Won'),
        supabase.from('clients').select('id', { count: 'exact', head: true }).like('status', 'Lost%'),
        supabase.from('clients').select('id', { count: 'exact', head: true }).like('status', 'Pending%'),
        supabase.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', thisMonth),
        supabase.from('candidates').select('id', { count: 'exact', head: true }).in('status', ['Available', 'In Process', 'Interview Scheduled']),
        supabase.from('candidates').select('id', { count: 'exact', head: true }).eq('status', 'WON'),
        supabase.from('candidates').select('id', { count: 'exact', head: true }).like('status', 'Lost%'),
        supabase.from('candidates').select('id', { count: 'exact', head: true }).gte('created_at', thisMonth),
        supabase.from('interviews').select('id', { count: 'exact', head: true }).gte('date_time', today + 'T00:00:00').lt('date_time', today + 'T23:59:59')
      ])
      
      setStats({
        totalCandidates: candidatesCount.count || 0,
        totalClients: clientsCount.count || 0,
        activeClients: activeClientsCount.count || 0,
        wonClients: wonClientsCount.count || 0,
        lostClients: lostClientsCount.count || 0,
        pendingClients: pendingClientsCount.count || 0,
        clientsThisMonth: clientsThisMonthCount.count || 0,
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
    loadDashboardData()
  }

  const statCards = [
    // Client Cards (6)
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
      name: 'Clients This Month',
      value: stats.clientsThisMonth,
      icon: Building2,
      color: 'bg-purple-500',
      href: '/clients',
    },
    // Candidate Cards (6)
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