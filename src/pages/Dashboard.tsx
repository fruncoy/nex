import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface DashboardStats {
  candidates: {
    total: number
    new_this_week: number
    overdue_followups: number
  }
  clients: {
    total: number
    active: number
    overdue_followups: number
  }
  training: {
    total: number
    new_this_week: number
    overdue_followups: number
  }
  interviews: {
    today: number
    this_week: number
    pending_outcomes: number
  }
}

interface OverdueItem {
  id: string
  name: string
  type: 'candidate' | 'client' | 'training'
  reminder_date: string
  status: string
}

interface TodayInterview {
  id: string
  candidate_name: string
  time: string
  location: string
  assigned_staff: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    candidates: { total: 0, new_this_week: 0, overdue_followups: 0 },
    clients: { total: 0, active: 0, overdue_followups: 0 },
    training: { total: 0, new_this_week: 0, overdue_followups: 0 },
    interviews: { today: 0, this_week: 0, pending_outcomes: 0 }
  })
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([])
  const [todayInterviews, setTodayInterviews] = useState<TodayInterview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Load candidates stats
      const { data: candidates } = await supabase.from('candidates').select('*')
      const candidateStats = {
        total: candidates?.length || 0,
        new_this_week: candidates?.filter(c => c.inquiry_date >= weekAgo).length || 0,
        overdue_followups: candidates?.filter(c => c.reminder_date && c.reminder_date < today).length || 0
      }

      // Load clients stats
      const { data: clients } = await supabase.from('clients').select('*')
      const clientStats = {
        total: clients?.length || 0,
        active: clients?.filter(c => c.status === 'Active' || c.status === 'Form filled, no response yet' || c.status === 'Communication ongoing' || c.status === 'Payment pending').length || 0,
        overdue_followups: clients?.filter(c => c.custom_reminder_datetime && c.custom_reminder_datetime.split('T')[0] < today).length || 0
      }

      // Load training stats
      const { data: training } = await supabase.from('training_leads').select('*')
      const trainingStats = {
        total: training?.length || 0,
        new_this_week: training?.filter(t => t.inquiry_date >= weekAgo).length || 0,
        overdue_followups: training?.filter(t => t.reminder_date && t.reminder_date < today).length || 0
      }

      // Load interviews stats
      const { data: interviews } = await supabase.from('interviews').select('*')
      const interviewStats = {
        today: interviews?.filter(i => i.date_time?.startsWith(today)).length || 0,
        this_week: interviews?.filter(i => i.date_time >= weekAgo).length || 0,
        pending_outcomes: interviews?.filter(i => !i.outcome).length || 0
      }

      setStats({
        candidates: candidateStats,
        clients: clientStats,
        training: trainingStats,
        interviews: interviewStats
      })

      // Load overdue items
      const overdue: OverdueItem[] = [
        ...(candidates?.filter(c => c.reminder_date && c.reminder_date < today).map(c => ({
          id: c.id,
          name: c.name,
          type: 'candidate' as const,
          reminder_date: c.reminder_date,
          status: c.status
        })) || []),
        ...(clients?.filter(c => c.custom_reminder_datetime && c.custom_reminder_datetime.split('T')[0] < today).map(c => ({
          id: c.id,
          name: c.name,
          type: 'client' as const,
          reminder_date: c.custom_reminder_datetime.split('T')[0],
          status: c.status
        })) || []),
        ...(training?.filter(t => t.reminder_date && t.reminder_date < today).map(t => ({
          id: t.id,
          name: t.name,
          type: 'training' as const,
          reminder_date: t.reminder_date,
          status: t.status
        })) || [])
      ]
      setOverdueItems(overdue)

      // Load today's interviews
      const { data: todayInterviewsData } = await supabase
        .from('interviews')
        .select(`
          id,
          date_time,
          location,
          assigned_staff,
          candidates!inner(name)
        `)
        .gte('date_time', today)
        .lt('date_time', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())

      setTodayInterviews(todayInterviewsData?.map(i => ({
        id: i.id,
        candidate_name: i.candidates?.name || 'Unknown',
        time: new Date(i.date_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        location: i.location,
        assigned_staff: i.assigned_staff
      })) || [])

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nestalk-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">NICHE Dashboard</h1>
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90"
        >
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Candidates</h3>
          <div className="text-2xl font-bold text-gray-900 mb-1">{stats.candidates.total}</div>
          <div className="text-sm text-gray-600">
            {stats.candidates.new_this_week} new this week
          </div>
          {stats.candidates.overdue_followups > 0 && (
            <div className="text-sm text-red-600 mt-1">
              {stats.candidates.overdue_followups} overdue follow-ups
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Clients</h3>
          <div className="text-2xl font-bold text-gray-900 mb-1">{stats.clients.total}</div>
          <div className="text-sm text-gray-600">
            {stats.clients.active} active inquiries
          </div>
          {stats.clients.overdue_followups > 0 && (
            <div className="text-sm text-red-600 mt-1">
              {stats.clients.overdue_followups} overdue follow-ups
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Training Leads</h3>
          <div className="text-2xl font-bold text-gray-900 mb-1">{stats.training.total}</div>
          <div className="text-sm text-gray-600">
            {stats.training.new_this_week} new this week
          </div>
          {stats.training.overdue_followups > 0 && (
            <div className="text-sm text-red-600 mt-1">
              {stats.training.overdue_followups} overdue follow-ups
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Interviews</h3>
          <div className="text-2xl font-bold text-gray-900 mb-1">{stats.interviews.today}</div>
          <div className="text-sm text-gray-600">
            scheduled today
          </div>
          {stats.interviews.pending_outcomes > 0 && (
            <div className="text-sm text-orange-600 mt-1">
              {stats.interviews.pending_outcomes} pending outcomes
            </div>
          )}
        </div>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Follow-ups */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Overdue Follow-ups ({overdueItems.length})
            </h2>
          </div>
          <div className="p-4">
            {overdueItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No overdue follow-ups</p>
            ) : (
              <div className="space-y-3">
                {overdueItems.slice(0, 5).map(item => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-600 capitalize">
                        {item.type} • Due: {new Date(item.reminder_date).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                      {item.status}
                    </span>
                  </div>
                ))}
                {overdueItems.length > 5 && (
                  <div className="text-center text-sm text-gray-500">
                    +{overdueItems.length - 5} more overdue items
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Today's Interviews */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Today's Interviews ({todayInterviews.length})
            </h2>
          </div>
          <div className="p-4">
            {todayInterviews.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No interviews scheduled today</p>
            ) : (
              <div className="space-y-3">
                {todayInterviews.map(interview => (
                  <div key={interview.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{interview.candidate_name}</div>
                      <div className="text-sm text-gray-600">
                        {interview.time} • {interview.location}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {interview.assigned_staff}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 text-center border border-gray-200 rounded-lg hover:bg-gray-50">
            <div className="text-2xl mb-2">👥</div>
            <div className="text-sm font-medium">Add Candidate</div>
          </button>
          <button className="p-4 text-center border border-gray-200 rounded-lg hover:bg-gray-50">
            <div className="text-2xl mb-2">🏢</div>
            <div className="text-sm font-medium">Add Client</div>
          </button>
          <button className="p-4 text-center border border-gray-200 rounded-lg hover:bg-gray-50">
            <div className="text-2xl mb-2">📚</div>
            <div className="text-sm font-medium">Add Training Lead</div>
          </button>
          <button className="p-4 text-center border border-gray-200 rounded-lg hover:bg-gray-50">
            <div className="text-2xl mb-2">📅</div>
            <div className="text-sm font-medium">Schedule Interview</div>
          </button>
        </div>
      </div>
    </div>
  )
}