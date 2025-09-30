import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MessageCircle, Clock, User, Calendar, Plus, Edit } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface ActivityLog {
  id: string
  user_id: string
  action_type: 'status_change' | 'edit' | 'create' | 'delete' | 'reschedule' | 'bulk_upload'
  entity_type?: 'candidate' | 'client' | 'training_lead' | 'interview' | 'meeting_note'
  entity_id?: string
  entity_name?: string
  old_value?: string
  new_value?: string
  description: string
  created_at: string
  staff?: {
    name: string
    username: string
  }
}

interface ReminderItem {
  id: string
  name: string
  phone?: string
  type: string
  reminder_date: string
  status: string
  notes: string
  source?: string
  inquiry_date: string
}

export function Updates() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'feed' | 'reminders'>('feed')
  
  const { user } = useAuth()

  useEffect(() => {
    Promise.all([loadActivityLogs(), loadReminders()])
  }, [])

  const loadActivityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          staff:user_id (name, username)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setActivityLogs(data || [])
    } catch (error) {
      console.error('Error loading activity logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadReminders = async () => {
    try {
      const now = new Date()
      const currentDateTime = now.toISOString()
      const today = now.toISOString().split('T')[0]
      
      const [candidateReminders, clientReminders, trainingReminders] = await Promise.all([
        supabase
          .from('candidates')
          .select('id, name, phone, source, role, inquiry_date, scheduled_date, status, assigned_to')
          .in('status', ['INTERVIEW_SCHEDULED'])
          .gte('scheduled_date', today),
        supabase
          .from('clients')
          .select('id, name, phone, gmail, inquiry_date, custom_reminder_datetime, status, want_to_hire')
          .not('custom_reminder_datetime', 'is', null)
          .gte('custom_reminder_datetime', currentDateTime),
        supabase
          .from('training_leads')
          .select('id, name, phone, inquiry_date, reminder_date, status, training_type')
          .gte('reminder_date', today)
          .not('status', 'eq', 'completed')
          .not('status', 'eq', 'dropped-off'),
      ])

      const allReminders = [
        ...(candidateReminders.data || []).map(item => ({ 
          ...item, 
          type: 'candidate',
          reminder_date: item.scheduled_date || item.inquiry_date,
          notes: `Role: ${item.role}`
        })),
        ...(clientReminders.data || []).map(item => ({ 
          ...item, 
          type: 'client',
          reminder_date: item.custom_reminder_datetime?.split('T')[0] || item.inquiry_date,
          notes: `Want to hire: ${item.want_to_hire}`
        })),
        ...(trainingReminders.data || []).map(item => ({ 
          ...item, 
          type: 'training',
          reminder_date: item.reminder_date,
          notes: `Training: ${item.training_type}`
        })),
      ]

      allReminders.sort((a, b) => new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime())
      setReminders(allReminders)
    } catch (error) {
      console.error('Error loading reminders:', error)
    }
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'login':
        return <User className="w-4 h-4 text-green-500" />
      case 'logout':
        return <User className="w-4 h-4 text-gray-500" />
      case 'status_change':
        return <Edit className="w-4 h-4 text-blue-500" />
      case 'create':
        return <Plus className="w-4 h-4 text-green-500" />
      case 'edit':
        return <Edit className="w-4 h-4 text-yellow-500" />
      default:
        return <MessageCircle className="w-4 h-4 text-gray-500" />
    }
  }

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
          onClick={() => setActiveTab('feed')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'feed'
              ? 'bg-white text-nestalk-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <MessageCircle className="w-4 h-4 inline mr-2" />
          Activity Feed
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'reminders'
              ? 'bg-white text-nestalk-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Active Reminders ({reminders.length})
        </button>
      </div>

      {activeTab === 'feed' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            {activityLogs.length > 0 ? (
              <div className="space-y-4">
                {activityLogs.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(activity.action_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <span>{new Date(activity.created_at).toLocaleString()}</span>
                        {activity.entity_type && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="capitalize">{activity.entity_type}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No activity yet</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'reminders' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Active Reminders ({reminders.length})
            </h3>
            {reminders.length > 0 ? (
              <div className="space-y-4">
                {reminders.map((reminder) => (
                  <div key={`${reminder.type}-${reminder.id}`} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{reminder.name}</h4>
                        <p className="text-sm text-gray-600">{reminder.notes}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {new Date(reminder.reminder_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          reminder.type === 'candidate' ? 'bg-blue-100 text-blue-800' :
                          reminder.type === 'client' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {reminder.type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No active reminders</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}