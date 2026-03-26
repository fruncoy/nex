import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Users, GraduationCap, Clock, CheckCircle, AlertCircle, TrendingUp, DollarSign, UserX, Calendar } from 'lucide-react'

interface NicheStats {
  totalTrainees: number
  activeTrainees: number
  graduatedTrainees: number
  pendingTrainees: number
  droppedTrainees: number
  suspendedTrainees: number
  totalCourses: number
  totalRevenue: number
  pendingPayments: number
  winRate: number
  totalCandidates: number
  graduatedCandidates: number
  recentActivities: any[]
}

export function Niche() {
  const [stats, setStats] = useState<NicheStats>({
    totalTrainees: 0,
    activeTrainees: 0,
    graduatedTrainees: 0,
    pendingTrainees: 0,
    droppedTrainees: 0,
    suspendedTrainees: 0,
    totalCourses: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    winRate: 0,
    totalCandidates: 0,
    graduatedCandidates: 0,
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

      // Get payment stats
      const { data: paymentsData } = await supabase
        .from('niche_payments')
        .select('amount')

      // Get fees with payment status
      const { data: feesData } = await supabase
        .from('niche_fees')
        .select('payment_status, amount')

      // Get recent activities from available tables
      const recentActivities = await loadRecentActivities()

      const totalTrainees = trainingData?.length || 0
      const activeTrainees = trainingData?.filter(t => t.status === 'Active').length || 0
      const graduatedTrainees = trainingData?.filter(t => t.status === 'Graduated').length || 0
      const pendingTrainees = trainingData?.filter(t => t.status === 'Pending').length || 0
      const droppedTrainees = trainingData?.filter(t => t.status === 'Dropped').length || 0
      const suspendedTrainees = trainingData?.filter(t => t.status === 'Suspended').length || 0
      
      // Get all NICHE candidates for win rate calculation
      const { data: allNicheCandidatesData } = await supabase
        .from('niche_candidates')
        .select('status')

      // Calculate win rate from all NICHE candidates (total pool)
      const totalCandidates = allNicheCandidatesData?.length || 0
      const graduatedCandidates = allNicheCandidatesData?.filter(c => c.status === 'Graduated').length || 0
      const winRate = totalCandidates > 0 ? Math.round((graduatedCandidates / totalCandidates) * 100) : 0

      const totalRevenue = paymentsData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
      const pendingPayments = feesData?.filter(f => f.payment_status === 'Pending').length || 0

      setStats({
        totalTrainees,
        activeTrainees,
        graduatedTrainees,
        pendingTrainees,
        droppedTrainees,
        suspendedTrainees,
        totalCourses: coursesData?.length || 0,
        totalRevenue,
        pendingPayments,
        winRate,
        recentActivities,
        totalCandidates,
        graduatedCandidates
      })
    } catch (error) {
      console.error('Error loading NICHE stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecentActivities = async () => {
    try {
      // Pull from activity_logs for NICHE entities (has staff name in description)
      const { data: loggedActivities } = await supabase
        .from('activity_logs')
        .select('description, created_at, action_type, entity_type, staff(name)')
        .in('entity_type', ['niche_training', 'niche_fees'])
        .order('created_at', { ascending: false })
        .limit(15)

      if (loggedActivities && loggedActivities.length > 0) {
        return loggedActivities.map(a => ({
          text: a.description,
          created_at: a.created_at,
          type: a.entity_type,
          by: a.staff?.name || null
        }))
      }

      // Fallback: raw records (no "who" info available)
      const activities: any[] = []

      const { data: trainingActivities } = await supabase
        .from('niche_training')
        .select('name, status, created_at, assigned_to')
        .order('created_at', { ascending: false })
        .limit(10)

      trainingActivities?.forEach(a => {
        activities.push({
          text: `New trainee: ${a.name} (${a.status})`,
          created_at: a.created_at,
          type: 'training',
          by: a.assigned_to || null
        })
      })

      const { data: paymentActivities } = await supabase
        .from('niche_payments')
        .select('amount, payment_date, niche_fees!inner(niche_training!inner(name))')
        .order('payment_date', { ascending: false })
        .limit(5)

      paymentActivities?.forEach(a => {
        activities.push({
          text: `Payment: KES ${a.amount.toLocaleString()} from ${a.niche_fees?.niche_training?.name || 'Unknown'}`,
          created_at: a.payment_date,
          type: 'payment',
          by: null
        })
      })

      return activities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 15)

    } catch (error) {
      console.error('Error loading recent activities:', error)
      return []
    }
  }

  const cards = [
    {
      title: 'Win Rate',
      value: `${stats.winRate}%`,
      subtitle: `${stats.graduatedCandidates}/${stats.totalCandidates} graduated`,
      icon: TrendingUp,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Total Trainees',
      value: stats.totalTrainees,
      subtitle: 'All time enrollment',
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Active Training',
      value: stats.activeTrainees,
      subtitle: 'Currently in progress',
      icon: GraduationCap,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Graduated',
      value: stats.graduatedTrainees,
      subtitle: 'Successfully completed',
      icon: CheckCircle,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600'
    }
  ]

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
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

      {/* Stats Cards - 4 Key Metrics in 1 Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <div className={`${card.color} p-2 rounded-lg mr-3`}>
                    <card.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">{card.title}</p>
                </div>
                <p className={`text-3xl font-bold ${card.textColor} mb-1`}>{card.value}</p>
                <p className="text-xs text-gray-500">{card.subtitle}</p>
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
                    <p className="text-sm text-gray-900">{activity.text}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.created_at).toLocaleDateString()} • {activity.type}
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