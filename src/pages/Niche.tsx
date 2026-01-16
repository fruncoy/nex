import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Users, GraduationCap, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'

interface NicheStats {
  totalTrainees: number
  activeTrainees: number
  completedTrainees: number
  pendingTrainees: number
  totalCourses: number
  recentActivities: any[]
}

export function Niche() {
  const [stats, setStats] = useState<NicheStats>({
    totalTrainees: 0,
    activeTrainees: 0,
    completedTrainees: 0,
    pendingTrainees: 0,
    totalCourses: 0,
    recentActivities: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNicheStats()
  }, [])

  const loadNicheStats = async () => {
    try {
      // Get training stats
      const { data: trainingData } = await supabase
        .from('niche_training')
        .select('status')

      // Get courses count
      const { data: coursesData } = await supabase
        .from('niche_courses')
        .select('id')
        .eq('is_active', true)

      // Get recent activities
      const { data: activitiesData } = await supabase
        .from('updates')
        .select('*')
        .eq('linked_to_type', 'niche_training')
        .order('created_at', { ascending: false })
        .limit(10)

      const totalTrainees = trainingData?.length || 0
      const activeTrainees = trainingData?.filter(t => t.status === 'Active').length || 0
      const completedTrainees = trainingData?.filter(t => t.status === 'Completed').length || 0
      const pendingTrainees = trainingData?.filter(t => t.status === 'Pending').length || 0

      setStats({
        totalTrainees,
        activeTrainees,
        completedTrainees,
        pendingTrainees,
        totalCourses: coursesData?.length || 0,
        recentActivities: activitiesData || []
      })
    } catch (error) {
      console.error('Error loading NICHE stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const cards = [
    {
      title: 'Total Trainees',
      value: stats.totalTrainees,
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Active Training',
      value: stats.activeTrainees,
      icon: GraduationCap,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Completed',
      value: stats.completedTrainees,
      icon: CheckCircle,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600'
    },
    {
      title: 'Pending Start',
      value: stats.pendingTrainees,
      icon: Clock,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Available Courses',
      value: stats.totalCourses,
      icon: TrendingUp,
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    },
    {
      title: 'Success Rate',
      value: stats.totalTrainees > 0 ? Math.round((stats.completedTrainees / stats.totalTrainees) * 100) + '%' : '0%',
      icon: AlertCircle,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600'
    }
  ]

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow h-32"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">NICHE Training Dashboard</h1>
        <p className="text-gray-600">Overview of specialized training programs</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {cards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent NICHE Activities</h2>
        </div>
        <div className="p-6">
          {stats.recentActivities.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-nestalk-primary rounded-full mt-2"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.update_text}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.created_at).toLocaleDateString()} by {activity.user_id}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activities</h3>
              <p className="mt-1 text-sm text-gray-500">
                Training activities will appear here once you start managing trainees.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}