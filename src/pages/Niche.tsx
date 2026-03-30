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
      // Debug: Check what's actually in the database
      console.log('Loading NICHE stats and activities...')
      
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

      // Debug: Check recent candidates
      const { data: recentCandidates } = await supabase
        .from('niche_candidates')
        .select('name, status, created_at, added_by')
        .order('created_at', { ascending: false })
        .limit(5)
      
      console.log('Recent candidates:', recentCandidates)

      // Get recent activities from available tables
      const recentActivities = await loadRecentActivities()
      console.log('Recent activities loaded:', recentActivities)

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
      console.log('Loading recent activities...')
      const activities: any[] = []
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Get the most recent candidates (prioritize these!)
      const { data: candidateActivities } = await supabase
        .from('niche_candidates')
        .select('name, status, created_at, updated_at, added_by, source')
        .order('created_at', { ascending: false })
        .limit(15)

      console.log('Candidate activities:', candidateActivities)

      candidateActivities?.forEach(a => {
        const activityDate = new Date(a.created_at)
        // Only show if it's a reasonable date (not in the future)
        if (activityDate <= now) {
          activities.push({
            text: `New NICHE Candidate: ${a.name} (${a.status}) - Source: ${a.source || 'Unknown'}`,
            created_at: a.created_at,
            type: 'niche_candidates',
            by: a.added_by || 'System',
            priority: 1 // High priority
          })
        }
      })

      // Get recent training activities
      const { data: trainingActivities } = await supabase
        .from('niche_training')
        .select('name, status, created_at, updated_at, created_by, updated_by')
        .order('created_at', { ascending: false })
        .limit(10)

      console.log('Training activities:', trainingActivities)

      trainingActivities?.forEach(a => {
        const activityDate = new Date(a.created_at)
        if (activityDate <= now) {
          activities.push({
            text: `NICHE Trainee: ${a.name} - Status: ${a.status}`,
            created_at: a.created_at,
            type: 'niche_training',
            by: a.created_by || 'System',
            priority: 2
          })
        }
      })

      // Get recent interview activities
      const { data: interviewActivities } = await supabase
        .from('niche_interviews')
        .select('candidate_name, status, created_at, assigned_staff')
        .order('created_at', { ascending: false })
        .limit(8)

      console.log('Interview activities:', interviewActivities)

      interviewActivities?.forEach(a => {
        const activityDate = new Date(a.created_at)
        if (activityDate <= now) {
          activities.push({
            text: `NICHE Interview: ${a.candidate_name} - ${a.status}`,
            created_at: a.created_at,
            type: 'niche_interviews',
            by: a.assigned_staff || 'System',
            priority: 2
          })
        }
      })

      // Get recent payments (lower priority)
      const { data: paymentActivities } = await supabase
        .from('niche_payments')
        .select(`
          amount, 
          created_at,
          niche_fees!inner(
            niche_training!inner(name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      paymentActivities?.forEach(a => {
        const activityDate = new Date(a.created_at)
        if (activityDate <= now) {
          activities.push({
            text: `Payment: KES ${a.amount.toLocaleString()} from ${a.niche_fees?.niche_training?.name || 'Unknown'}`,
            created_at: a.created_at,
            type: 'niche_payments',
            by: 'Finance',
            priority: 3 // Lower priority
          })
        }
      })

      // Sort by priority first, then by date
      const sortedActivities = activities
        .filter(a => {
          const activityDate = new Date(a.created_at)
          return activityDate <= now && activityDate >= new Date('2024-01-01') // Reasonable date range
        })
        .sort((a, b) => {
          // First sort by priority (lower number = higher priority)
          if (a.priority !== b.priority) {
            return a.priority - b.priority
          }
          // Then sort by date (most recent first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        .slice(0, 15)

      console.log('Final sorted activities:', sortedActivities)
      return sortedActivities

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
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Recent NICHE Activities</h2>
          <button
            onClick={loadNicheStats}
            className="text-sm text-nestalk-primary hover:text-nestalk-primary/80 font-medium"
          >
            Refresh
          </button>
        </div>
        <div className="p-6">
          {stats.recentActivities.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivities.map((activity, index) => {
                const getActivityIcon = (type: string) => {
                  switch (type) {
                    case 'niche_training':
                      return <GraduationCap className="w-4 h-4 text-blue-500" />
                    case 'niche_candidates':
                      return <Users className="w-4 h-4 text-green-500" />
                    case 'niche_payments':
                      return <DollarSign className="w-4 h-4 text-emerald-500" />
                    case 'niche_fees':
                      return <Clock className="w-4 h-4 text-orange-500" />
                    default:
                      return <AlertCircle className="w-4 h-4 text-gray-500" />
                  }
                }

                const getActivityColor = (type: string) => {
                  switch (type) {
                    case 'niche_training':
                      return 'bg-blue-50 border-blue-200'
                    case 'niche_candidates':
                      return 'bg-green-50 border-green-200'
                    case 'niche_payments':
                      return 'bg-emerald-50 border-emerald-200'
                    case 'niche_fees':
                      return 'bg-orange-50 border-orange-200'
                    default:
                      return 'bg-gray-50 border-gray-200'
                  }
                }

                return (
                  <div key={index} className={`flex items-start space-x-3 p-4 rounded-lg border ${getActivityColor(activity.type)}`}>
                    <div className="flex-shrink-0 mt-0.5">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium">{activity.text}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-xs text-gray-500">
                          {new Date(activity.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {activity.by && activity.by !== 'System' && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <p className="text-xs text-gray-600 font-medium">{activity.by}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
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