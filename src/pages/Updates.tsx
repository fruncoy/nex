import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MessageCircle, User, Calendar, Edit, Activity, QrCode } from 'lucide-react'
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
  staff?: { name: string; email: string }
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
  staff?: { name: string; email: string }
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
  staff?: { name: string; email: string }
}

export function Updates() {
  const [allActivities, setAllActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [scanLogs, setScanLogs] = useState<any[]>([])
  const [scanLogsLoading, setScanLogsLoading] = useState(false)

  const { user } = useAuth()

  useEffect(() => {
    loadAllActivities()

    const subscription = supabase
      .channel('updates-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
        loadAllActivities()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'updates' }, () => {
        loadAllActivities()
      })
      .subscribe()

    return () => { subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (filterType === 'verification') {
      loadScanLogs()
    }
  }, [filterType])

  const loadScanLogs = async () => {
    setScanLogsLoading(true)
    try {
      const { data, error } = await supabase
        .from('certificate_scan_logs')
        .select('*')
        .order('scanned_at', { ascending: false })
        .limit(200)
      if (!error && data) setScanLogs(data)
    } catch (err) {
      console.error('Error loading scan logs:', err)
    } finally {
      setScanLogsLoading(false)
    }
  }

  const loadAllActivities = async () => {
    try {
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
    if (type === 'placement') return <Activity className="w-4 h-4 text-purple-500" />
    if (type === 'status_history') return <Edit className="w-4 h-4 text-blue-500" />
    switch (entityType) {
      case 'candidate':     return <User className="w-4 h-4 text-green-500" />
      case 'client':        return <MessageCircle className="w-4 h-4 text-blue-500" />
      case 'training_lead': return <Calendar className="w-4 h-4 text-orange-500" />
      case 'interview':     return <Calendar className="w-4 h-4 text-red-500" />
      default:              return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const filteredActivities = allActivities.filter(activity => {
    if (filterType === 'all') return true
    return activity.entity_type === filterType
  })

  const tabBtn = (label: string, value: string) => (
    <button
      onClick={() => setFilterType(value)}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        filterType === value
          ? 'bg-white text-nestalk-primary shadow-sm'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  )

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

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1 mb-6">
        {tabBtn('All Activities', 'all')}
        {tabBtn('Candidates', 'candidate')}
        {tabBtn('Clients', 'client')}
        {tabBtn('Placements', 'placement')}
        {tabBtn('Interviews', 'interview')}
        {/* Verifications tab */}
        <button
          onClick={() => setFilterType('verification')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filterType === 'verification'
              ? 'bg-white text-nestalk-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          Verifications
        </button>
      </div>

      {/* Verifications panel */}
      {filterType === 'verification' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-[#d95637]" />
              <h3 className="text-lg font-semibold text-gray-900">
                Certificate Scan Logs
              </h3>
              {!scanLogsLoading && (
                <span className="ml-auto text-sm text-gray-500">{scanLogs.length} scans</span>
              )}
            </div>

            {scanLogsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nestalk-primary"></div>
              </div>
            ) : scanLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No scans recorded yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Certificate</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trainee</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Scanned At</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Timezone</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanLogs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-mono text-[#d95637] font-semibold">{log.cert_token}</td>
                        <td className="py-2.5 px-3 text-gray-700">{log.trainee_name || '—'}</td>
                        <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">
                          {new Date(log.scanned_at).toLocaleString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 text-xs">{log.timezone || '—'}</td>
                        <td className="py-2.5 px-3 text-gray-400 text-xs max-w-[200px] truncate" title={log.user_agent}>
                          {log.user_agent
                            ? log.user_agent.includes('iPhone') ? '📱 iPhone'
                            : log.user_agent.includes('Android') ? '📱 Android'
                            : log.user_agent.includes('iPad') ? '📱 iPad'
                            : '💻 Desktop'
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Normal activity feed */
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
      )}
    </div>
  )
}
