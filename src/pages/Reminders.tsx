import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Clock, User, MessageCircle, Calendar, AlertTriangle } from 'lucide-react'
import { formatDateTime } from '../utils/dateFormat'

interface CandidateReminder {
  id: string
  name: string
  phone: string
  role: string
  scheduled_date: string
  status: string
  type: 'interview'
}

interface ClientReminder {
  id: string
  name: string
  phone: string
  want_to_hire: string
  custom_reminder_datetime: string
  status: string
  type: 'custom_reminder'
}

interface FollowupReminder {
  id: string
  client_name: string
  candidate_name: string
  followup_type: string
  scheduled_date: string
  status: 'overdue' | 'due_today' | 'upcoming'
  type: 'followup'
}

type ReminderItem = CandidateReminder | ClientReminder | FollowupReminder

export function Reminders() {
  const [candidateReminders, setCandidateReminders] = useState<CandidateReminder[]>([])
  const [clientReminders, setClientReminders] = useState<ClientReminder[]>([])
  const [followupReminders, setFollowupReminders] = useState<FollowupReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'candidates' | 'clients' | 'placements'>('candidates')

  useEffect(() => {
    loadReminders()
  }, [])

  const loadReminders = async () => {
    try {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const currentDateTime = now.toISOString()

      const [candidatesRes, clientsRes, followupsRes] = await Promise.all([
        // Candidate interviews scheduled for today or future
        supabase
          .from('candidates')
          .select('id, name, phone, role, scheduled_date, status')
          .eq('status', 'INTERVIEW_SCHEDULED')
          .gte('scheduled_date', today),
        
        // Client custom reminders
        supabase
          .from('clients')
          .select('id, name, phone, want_to_hire, custom_reminder_datetime, status')
          .not('custom_reminder_datetime', 'is', null)
          .gte('custom_reminder_datetime', currentDateTime),
        
        // Placement follow-ups (overdue, due today, upcoming)
        supabase
          .from('placement_followup_dashboard')
          .select('*')
          .in('status', ['overdue', 'due_today', 'upcoming'])
          .eq('completed', false)
      ])

      setCandidateReminders((candidatesRes.data || []).map(item => ({
        ...item,
        type: 'interview' as const
      })))

      setClientReminders((clientsRes.data || []).map(item => ({
        ...item,
        type: 'custom_reminder' as const
      })))

      setFollowupReminders((followupsRes.data || []).map(item => ({
        ...item,
        type: 'followup' as const
      })))

    } catch (error) {
      console.error('Error loading reminders:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFollowupTypeLabel = (type: string) => {
    const labels = {
      '2_week': '2 Weeks',
      '4_week': '4 Weeks', 
      '6_week': '6 Weeks',
      '8_week': '8 Weeks',
      '10_week': '10 Weeks',
      '12_week': '12 Weeks'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getReminderPriority = (reminder: FollowupReminder) => {
    if (reminder.status === 'overdue') return 'high'
    if (reminder.status === 'due_today') return 'medium'
    return 'low'
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
          <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
          <p className="text-gray-600">All upcoming interviews, follow-ups, and custom reminders</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
        <button
          onClick={() => setActiveTab('candidates')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'candidates'
              ? 'bg-white text-nestalk-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <User className="w-4 h-4 inline mr-2" />
          Candidates ({candidateReminders.length})
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'clients'
              ? 'bg-white text-nestalk-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <MessageCircle className="w-4 h-4 inline mr-2" />
          Clients ({clientReminders.length})
        </button>
        <button
          onClick={() => setActiveTab('placements')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'placements'
              ? 'bg-white text-nestalk-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Placements ({followupReminders.length})
        </button>
      </div>

      {activeTab === 'candidates' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-500" />
              Scheduled Interviews ({candidateReminders.length})
            </h3>
            {candidateReminders.length > 0 ? (
              <div className="space-y-4">
                {candidateReminders.map((reminder) => (
                  <div key={reminder.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{reminder.name}</h4>
                        <p className="text-sm text-gray-600">Role: {reminder.role}</p>
                        <p className="text-sm text-gray-600">Phone: {reminder.phone}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Interview: {formatDateTime(reminder.scheduled_date)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Interview
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No candidate reminders</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No upcoming interviews for candidates.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-green-500" />
              Custom Client Reminders ({clientReminders.length})
            </h3>
            {clientReminders.length > 0 ? (
              <div className="space-y-4">
                {clientReminders.map((reminder) => (
                  <div key={reminder.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{reminder.name}</h4>
                        <p className="text-sm text-gray-600">Want to hire: {reminder.want_to_hire}</p>
                        <p className="text-sm text-gray-600">Phone: {reminder.phone}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Reminder: {formatDateTime(reminder.custom_reminder_datetime)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Custom Reminder
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No client reminders</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No custom reminders set for clients.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'placements' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-purple-500" />
              Placement Follow-ups ({followupReminders.length})
            </h3>
            {followupReminders.length > 0 ? (
              <div className="space-y-4">
                {followupReminders.map((reminder) => (
                  <div key={reminder.id} className={`border rounded-lg p-4 hover:bg-gray-50 ${
                    reminder.status === 'overdue' ? 'border-red-300 bg-red-50' :
                    reminder.status === 'due_today' ? 'border-yellow-300 bg-yellow-50' :
                    'border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{reminder.client_name}</h4>
                        <p className="text-sm text-gray-600">Candidate: {reminder.candidate_name}</p>
                        <p className="text-sm text-gray-600">Follow-up: {getFollowupTypeLabel(reminder.followup_type)}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {formatDateTime(reminder.scheduled_date)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {reminder.status === 'overdue' && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          reminder.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          reminder.status === 'due_today' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {reminder.status === 'overdue' ? 'OVERDUE' :
                           reminder.status === 'due_today' ? 'DUE TODAY' :
                           'UPCOMING'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No placement follow-ups</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No upcoming placement follow-ups scheduled.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}