import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MessageCircle, User, Calendar, Plus, Edit, Activity } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { formatDateTime } from '../utils/dateFormat'

interface Update {
  id: string
  linked_to_type: string
  linked_to_id: string
  user_id: string
  update_text: string
  created_at: string
  reminder_date?: string
  staff?: {
    name: string
    email: string
  }
}

interface PlacementActivity {
  id: string
  placement_id: string
  client_id: string
  activity_type: string
  activity_description: string
  performed_by: string
  performed_at: string
  metadata: any
  staff?: {
    name: string
    email: string
  }
}

interface StatusHistory {
  id: string
  candidate_id?: string
  client_id?: string
  old_status: string
  new_status: string
  changed_by: string
  changed_at: string
  duration_in_status: string
  entity_type: 'candidate' | 'client'
  staff?: {
    name: string
    email: string
  }
}



export function Updates() {
  const [allActivities, setAllActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  
  const { user } = useAuth()

  useEffect(() => {
    loadAllActivities()
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('updates-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
        loadAllActivities()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'updates' }, () => {
        loadAllActivities()
      })
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadAllActivities = async () => {
    try {
      // Load from activity_logs table (new consolidated table)
      const { data: activityLogsData, error: activityLogsError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (activityLogsError) {
        console.error('Error loading activity logs:', activityLogsError)
      }

      const activities = (activityLogsData || []).map(item => ({
        ...item,
        type: 'activity_log',
        timestamp: item.created_at,
        description: item.description || 'Activity logged',
        entity_type: item.entity_type || 'general',
        staff: { name: item.performed_by }
      }))

      // Also load from updates table for backward compatibility
      const { data: updatesData, error: updatesError } = await supabase
        .from('updates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (updatesError) {
        console.error('Error loading updates:', updatesError)
      }

      if (updatesData) {
        activities.push(...updatesData.map(item => ({
          ...item,
          type: 'update',
          timestamp: item.created_at,
          description: item.update_text || 'Update logged',
          entity_type: item.linked_to_type || 'general'
        })))
      }



      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setAllActivities(activities)
    } catch (error) {
      console.error('Error loading activities:', error)
    } finally {
      setLoading(false)
    }
  }



  const getActivityIcon = (type: string, entityType: string) => {
    if (type === 'placement') {
      return <Activity className="w-4 h-4 text-purple-500" />
    }
    if (type === 'status_history') {
      return <Edit className="w-4 h-4 text-blue-500" />
    }
    switch (entityType) {
      case 'candidate':
        return <User className="w-4 h-4 text-green-500" />
      case 'client':
        return <MessageCircle className="w-4 h-4 text-blue-500" />
      case 'training_lead':
        return <Calendar className="w-4 h-4 text-orange-500" />
      case 'interview':
        return <Calendar className="w-4 h-4 text-red-500" />
      default:
        return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const filteredActivities = allActivities.filter(activity => {
    if (filterType === 'all') return true
    return activity.entity_type === filterType
  })

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nestalk-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Updates & Activity</h1>
          <p className="text-gray-600">Track team activity and reminders</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filterType === 'all'
              ? 'bg-white text-nestalk-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All Activities
        </button>
        <button
          onClick={() => setFilterType('candidate')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filterType === 'candidate'
              ? 'bg-white text-nestalk-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Candidates
        </button>
        <button
          onClick={() => setFilterType('client')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filterType === 'client'
              ? 'bg-white text-nestalk-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Clients
        </button>
        <button
          onClick={() => setFilterType('placement')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filterType === 'placement'
              ? 'bg-white text-nestalk-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Placements
        </button>
        <button
          onClick={() => setFilterType('interview')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filterType === 'interview'
              ? 'bg-white text-nestalk-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Interviews
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            All Activities ({filteredActivities.length})
          </h3>
          {filteredActivities.length > 0 ? (
            <div className="space-y-4">
              {filteredActivities.map((activity) => (
                <div key={`${activity.type}-${activity.id}`} className="flex items-start space-x-4 p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type, activity.entity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <span>{formatDateTime(activity.timestamp)}</span>
                      <span className="mx-2">•</span>
                      <span className="capitalize">{activity.entity_type}</span>
                      {activity.staff?.name && (
                        <>
                          <span className="mx-2">•</span>
                          <span>by {activity.staff.name}</span>
                        </>
                      )}
                      {activity.type === 'status_history' && activity.duration_in_status && (
                        <>
                          <span className="mx-2">•</span>
                          <span>Duration: {activity.duration_in_status}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No activities found</p>
          )}
        </div>
      </div>
    </div>
  )
}