import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SearchFilter } from '../components/ui/SearchFilter'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Plus, Calendar, CheckCircle, XCircle, Clock, MessageSquare, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { ActivityLogger } from '../lib/activityLogger'
import { smsService } from '../services/smsService'

interface Interview {
  id: string
  candidate_id: string
  date_time: string
  assigned_staff: string | null
  attended: boolean
  outcome: string | null
  created_at: string
  needsAttention?: boolean
  candidates?: {
    name: string
    phone: string
    status: string
  }
}

interface Candidate {
  id: string
  name: string
}

export function Interviews() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [filteredInterviews, setFilteredInterviews] = useState<Interview[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'date_time' | 'scheduled_date'>('created_at')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null)
  const [formData, setFormData] = useState({
    candidate_id: '',
    date_time: '',
    attended: false,
    outcome: '',
  })
  const [candidateSearch, setCandidateSearch] = useState('')
  const [showCandidateDropdown, setShowCandidateDropdown] = useState(false)
  const [selectedInterviews, setSelectedInterviews] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('')
  const [smsStates, setSmsStates] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'failed'>>({})

  // reschedule state
  const [reschedule, setReschedule] = useState<{ open: boolean; interview: Interview | null; dateTime: string }>({
    open: false, interview: null, dateTime: ''
  })

  const { user, staff } = useAuth()
  const { showToast } = useToast()

  const statusOptions = ['all', 'scheduled', 'won', 'lost']
  const outcomeOptions = ['Interview_Won', 'Interview_Lost', 'Missed_Interview', 'Reschedule_Interview']

  const getInterviewStatus = (interview: Interview) => {
    // If interview has an outcome, show that
    if (interview.outcome) {
      if (interview.outcome === 'Interview_Won') return 'won'
      if (interview.outcome === 'Interview_Lost') return 'lost'
      if (interview.outcome === 'Missed_Interview') return 'missed'
      // No "rescheduled" status - when rescheduled, it becomes "scheduled" again
    }
    
    // If no outcome, check if time has passed - auto "needs attention"
    const now = new Date()
    const interviewTime = new Date(interview.date_time)
    
    if (interviewTime < now) {
      return 'needs_attention' // Time passed, no status set = needs attention
    }
    
    return 'scheduled' // Future interview, no outcome = scheduled
  }

  const getDropdownValue = (interview: Interview) => {
    // Dropdown only shows actual outcomes, not auto-statuses
    if (interview.outcome) {
      if (interview.outcome === 'Interview_Won') return 'Interview_Won'
      if (interview.outcome === 'Interview_Lost') return 'Interview_Lost'
      if (interview.outcome === 'Missed_Interview') return 'Missed_Interview'
      // No rescheduled option - when rescheduled, outcome is cleared
    }
    return '' // Empty for placeholder
  }

  const handleStatusChange = async (interview: Interview, newStatus: string) => {
    if (!newStatus) return // Don't process empty selection
    
    // If reschedule is selected, open the modal instead of updating status
    if (newStatus === 'Reschedule_Interview') {
      // Set time to 9AM automatically
      const currentDate = new Date(interview.date_time)
      const newDate = new Date(currentDate)
      newDate.setHours(9, 0, 0, 0) // Set to 9:00 AM
      const dateTimeString = newDate.toISOString().slice(0, 16) // Format for datetime-local input
      
      setReschedule({ open: true, interview, dateTime: dateTimeString })
      return
    }
    
    try {
      let outcome = newStatus // Use exact database values
      let attended = false
      let candidateStatus = ''

      switch (newStatus) {
        case 'Interview_Won':
          attended = true
          candidateStatus = 'WON - Interview Won'
          break
        case 'Interview_Lost':
          attended = true
          candidateStatus = 'Lost - Interview Lost'
          break
        case 'Missed_Interview':
          attended = false
          candidateStatus = 'Lost - Missed Interview'
          break
      }

      console.log('Updating interview:', {
        interview_id: interview.id,
        outcome,
        attended,
        candidate_id: interview.candidate_id,
        candidateStatus
      })

      // Update interview
      const { error: interviewError } = await supabase
        .from('interviews')
        .update({ outcome, attended })
        .eq('id', interview.id)

      if (interviewError) {
        console.error('Interview update error:', interviewError)
        throw interviewError
      }

      // Update candidate status if needed
      if (candidateStatus) {
        const { error: candidateError } = await supabase
          .from('candidates')
          .update({ status: candidateStatus })
          .eq('id', interview.candidate_id)

        if (candidateError) {
          console.error('Candidate update error:', candidateError)
          throw candidateError
        }
        
        console.log('Candidate status updated to:', candidateStatus)
      }

      // Log activity
      await ActivityLogger.log({
        userId: staff?.id || user?.id || '',
        actionType: 'status_change',
        entityType: 'interview',
        entityId: interview.id,
        entityName: interview.candidates?.name || 'Unknown Candidate',
        oldValue: interview.outcome || 'No Status',
        newValue: newStatus,
        description: `Interview outcome updated from ${interview.outcome || 'No Status'} to ${newStatus.replace('_', ' ')}`
      })

      showToast(`Interview status updated to ${newStatus.replace('_', ' ')}`, 'success')
      fetchInterviews()
    } catch (error) {
      console.error('Status update failed:', error)
      showToast('Failed to update interview status', 'error')
    }
  }

  const handleReschedule = async (interview: Interview, newDateTime: string) => {
    try {
      const { error } = await supabase
        .from('interviews')
        .update({ 
          date_time: newDateTime,
          outcome: null,
          attended: false
        })
        .eq('id', interview.id)

      if (error) throw error

      // Update candidate status to INTERVIEW_SCHEDULED when rescheduled
      const { error: candidateError } = await supabase
        .from('candidates')
        .update({ status: 'INTERVIEW_SCHEDULED' })
        .eq('id', interview.candidate_id)

      if (candidateError) throw candidateError

      // Log reschedule activity
      await ActivityLogger.logReschedule(
        staff?.id || user?.id || '',
        'interview',
        interview.id,
        interview.candidates?.name || 'Unknown Candidate',
        interview.date_time,
        newDateTime,
        staff?.name || user?.email || 'Unknown User'
      )

      showToast('Interview rescheduled successfully', 'success')
      setReschedule({ open: false, interview: null, dateTime: '' })
      fetchInterviews()
    } catch (error) {
      showToast('Failed to reschedule interview', 'error')
    }
  }

  const getCountdown = (interviewDateTime: string) => {
    const interview = new Date(interviewDateTime)
    const now = new Date()
    const diff = interview.getTime() - now.getTime()
    
    if (diff < 0) return '-'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getStatusDisplay = (interview: Interview) => {
    const status = getInterviewStatus(interview)
    
    const statusConfig = {
      scheduled: {
        text: 'Interview Scheduled',
        className: 'bg-blue-50 text-blue-700 border border-blue-200'
      },
      needs_attention: {
        text: 'Needs Attention',
        className: 'bg-red-50 text-red-700 border border-red-200'
      },
      won: {
        text: 'Interview Won',
        className: 'bg-green-50 text-green-700 border border-green-200'
      },
      lost: {
        text: 'Interview Lost',
        className: 'bg-red-50 text-red-700 border border-red-200'
      },
      missed: {
        text: 'Missed Interview',
        className: 'bg-orange-50 text-orange-700 border border-orange-200'
      }
    }

    const config = statusConfig[status] || statusConfig.scheduled
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
        {config.text}
      </span>
    )
  }

  const handleOutcomeUpdate = async (interview: Interview, outcome: string) => {
    try {
      // Update interview outcome
      const { error: interviewError } = await supabase
        .from('interviews')
        .update({ 
          outcome,
          attended: outcome === 'Interview_Won' || outcome === 'Interview_Lost'
        })
        .eq('id', interview.id)

      if (interviewError) throw interviewError

      // Update candidate status based on outcome
      let candidateStatus = ''
      if (outcome === 'Interview_Won') {
        candidateStatus = 'WON - Interview Won'
      } else if (outcome === 'Interview_Lost') {
        candidateStatus = 'Lost - Interview Lost'
      } else if (outcome === 'Missed_Interview') {
        candidateStatus = 'Lost - Missed Interview'
      }

      if (candidateStatus) {
        const { error: candidateError } = await supabase
          .from('candidates')
          .update({ status: candidateStatus })
          .eq('id', interview.candidate_id)

        if (candidateError) throw candidateError
      }

      // Log activity
      await ActivityLogger.logActivity({
        type: 'interview_outcome',
        description: `Interview outcome updated to ${outcome}`,
        metadata: {
          interview_id: interview.id,
          candidate_id: interview.candidate_id,
          outcome
        }
      })

      showToast(`Interview marked as ${outcome.replace('_', ' ')}`, 'success')
      fetchInterviews() // Refresh data
    } catch (error) {
      showToast('Failed to update interview outcome', 'error')
    }
  }

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedInterviews.length === 0) {
      showToast('Please select interviews to update', 'error')
      return
    }

    try {
      for (const interviewId of selectedInterviews) {
        const interview = interviews.find(i => i.id === interviewId)
        if (interview) {
          await handleStatusChange(interview, status)
        }
      }
      setSelectedInterviews([])
      showToast(`Updated ${selectedInterviews.length} interviews to ${status.replace('_', ' ')}`, 'success')
    } catch (error) {
      showToast('Failed to update interviews', 'error')
    }
  }

  const handleScheduleInterview = async () => {
    if (!formData.candidate_id || !formData.date_time) {
      showToast('Please select candidate and date/time', 'error')
      return
    }

    // Set time to 9:00 AM automatically
    const selectedDate = new Date(formData.date_time)
    selectedDate.setHours(9, 0, 0, 0)
    const finalDateTime = selectedDate.toISOString()

    try {
      const { error } = await supabase
        .from('interviews')
        .insert({
          candidate_id: formData.candidate_id,
          date_time: finalDateTime,
          assigned_staff: staff?.id || user?.id
        })

      if (error) throw error

      showToast('Interview scheduled successfully', 'success')
      setShowModal(false)
      setFormData({ candidate_id: '', date_time: '', attended: false, outcome: '' })
      setCandidateSearch('')
      fetchInterviews()
    } catch (error) {
      showToast('Failed to schedule interview', 'error')
    }
  }

  const filteredCandidates = candidates.filter(candidate =>
    candidate.name.toLowerCase().includes(candidateSearch.toLowerCase())
  )

  const canSendSMS = (interviewDateTime: string) => {
    const interview = new Date(interviewDateTime)
    const now = new Date()
    const hoursDiff = (interview.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursDiff > 6
  }

  const handleSendSMS = async (interview: Interview) => {
    if (!interview.candidates?.name || !interview.candidates?.phone) {
      showToast('Missing candidate information', 'error')
      return
    }

    setSmsStates(prev => ({ ...prev, [interview.id]: 'sending' }))

    try {
      const interviewDay = new Date(interview.date_time).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      const message = smsService.generateInterviewReminderMessage(
        interview.candidates.name,
        interviewDay
      )

      const result = await smsService.sendSMS({
        recipientType: 'candidate',
        recipientId: interview.candidate_id,
        recipientName: interview.candidates.name,
        phoneNumber: interview.candidates.phone,
        messageType: 'interview_reminder',
        messageContent: message,
        sentBy: staff?.id || user?.id || ''
      })

      if (result.success) {
        setSmsStates(prev => ({ ...prev, [interview.id]: 'sent' }))
        showToast('SMS sent successfully', 'success')
      } else {
        setSmsStates(prev => ({ ...prev, [interview.id]: 'failed' }))
        showToast(`SMS failed: ${result.error}`, 'error')
      }
    } catch (error) {
      setSmsStates(prev => ({ ...prev, [interview.id]: 'failed' }))
      showToast('Failed to send SMS', 'error')
    }
  }

  useEffect(() => {
    fetchInterviews()
    fetchCandidates()
  }, [])

  const fetchInterviews = async () => {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          *,
          candidates (
            name,
            phone,
            status
          )
        `)
        .order('date_time', { ascending: false })

      if (error) throw error
      setInterviews(data || [])
    } catch (error) {
      showToast('Failed to fetch interviews', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('id, name')
        .order('name')

      if (error) throw error
      setCandidates(data || [])
    } catch (error) {
      console.error('Failed to fetch candidates:', error)
    }
  }

  useEffect(() => {
    let filtered = interviews

    if (searchTerm) {
      filtered = filtered.filter(interview =>
        interview.candidates?.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(interview => {
        if (filterStatus === 'scheduled') return !interview.attended && !interview.outcome
        if (filterStatus === 'won') return interview.outcome === 'Interview_Won'
        if (filterStatus === 'lost') return interview.outcome === 'Interview_Lost'
        return true
      })
    }

    setFilteredInterviews(filtered)
  }, [interviews, searchTerm, filterStatus])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow h-32"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
          <p className="text-gray-600">Schedule and track candidate interviews</p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedInterviews.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{selectedInterviews.length} selected</span>
              <button
                onClick={() => handleBulkStatusUpdate('Interview_Won')}
                className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200"
              >
                Mark Won
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('Interview_Lost')}
                className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
              >
                Mark Lost
              </button>
            </div>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Interview
          </button>
        </div>
      </div>
      
      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        statusOptions={statusOptions}
        placeholder="Search interviews..."
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedInterviews.length === filteredInterviews.length && filteredInterviews.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedInterviews(filteredInterviews.map(i => i.id))
                      } else {
                        setSelectedInterviews([])
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Countdown
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reminder
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInterviews.map((interview, index) => {
                const smsState = smsStates[interview.id] || 'idle'
                const canSend = canSendSMS(interview.date_time)
                
                return (
                  <tr key={interview.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedInterviews.includes(interview.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedInterviews([...selectedInterviews, interview.id])
                          } else {
                            setSelectedInterviews(selectedInterviews.filter(id => id !== interview.id))
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {interview.candidates?.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {interview.candidates?.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(interview.date_time).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(interview.date_time).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusDisplay(interview)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getCountdown(interview.date_time)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <select
                          value={getDropdownValue(interview)}
                          onChange={(e) => handleStatusChange(interview, e.target.value)}
                          className="text-sm font-semibold border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          <option value="" disabled>- Set Status</option>
                          <option value="Interview_Won">Interview Won</option>
                          <option value="Interview_Lost">Interview Lost</option>
                          <option value="Missed_Interview">Missed Interview</option>
                          <option value="Reschedule_Interview">Reschedule Interview</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {canSend ? (
                        <button
                          onClick={() => handleSendSMS(interview)}
                          disabled={smsState === 'sending' || smsState === 'sent'}
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-colors ${
                            smsState === 'sent'
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : smsState === 'sending'
                              ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                              : smsState === 'failed'
                              ? 'bg-red-100 text-red-600 hover:bg-red-200'
                              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          }`}
                        >
                          {smsState === 'sending' ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <MessageSquare className="w-3 h-3 mr-1" />
                          )}
                          {smsState === 'sending' ? 'Sending...' :
                           smsState === 'sent' ? 'Sent' :
                           smsState === 'failed' ? 'Retry' : 'SMS'}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {filteredInterviews.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No interviews found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Schedule your first interview to get started'
              }
            </p>
          </div>
        )}
      </div>
      
      {/* Schedule Interview Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px] max-h-96 overflow-y-auto relative">
            <button
              onClick={() => {
                setShowModal(false)
                setFormData({ candidate_id: '', date_time: '', attended: false, outcome: '' })
                setCandidateSearch('')
                setShowCandidateDropdown(false)
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ×
            </button>
            <h3 className="text-lg font-medium mb-4">Schedule Interview</h3>
            
            <div className="mb-4 relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Candidate
              </label>
              <input
                type="text"
                value={candidateSearch}
                onChange={(e) => {
                  setCandidateSearch(e.target.value)
                  setShowCandidateDropdown(true)
                }}
                onFocus={() => setShowCandidateDropdown(true)}
                placeholder="Type candidate name..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              {showCandidateDropdown && filteredCandidates.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {filteredCandidates.slice(0, 10).map((candidate) => (
                    <button
                      key={candidate.id}
                      onClick={() => {
                        setFormData({ ...formData, candidate_id: candidate.id })
                        setCandidateSearch(candidate.name)
                        setShowCandidateDropdown(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100"
                    >
                      {candidate.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interview Date (Time will be set to 9:00 AM)
              </label>
              <input
                type="date"
                value={formData.date_time ? formData.date_time.split('T')[0] : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const date = new Date(e.target.value)
                    date.setHours(9, 0, 0, 0)
                    setFormData({ ...formData, date_time: date.toISOString().slice(0, 16) })
                  } else {
                    setFormData({ ...formData, date_time: '' })
                  }
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  setFormData({ candidate_id: '', date_time: '', attended: false, outcome: '' })
                  setCandidateSearch('')
                  setShowCandidateDropdown(false)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleInterview}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Reschedule Modal */}
      {reschedule.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Reschedule Interview</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Date (Time will be set to 9:00 AM)
              </label>
              <input
                type="date"
                value={reschedule.dateTime ? reschedule.dateTime.split('T')[0] : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const date = new Date(e.target.value)
                    date.setHours(9, 0, 0, 0)
                    setReschedule(prev => ({ ...prev, dateTime: date.toISOString().slice(0, 16) }))
                  } else {
                    setReschedule(prev => ({ ...prev, dateTime: '' }))
                  }
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setReschedule({ open: false, interview: null, dateTime: '' })}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => reschedule.interview && handleReschedule(reschedule.interview, reschedule.dateTime)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}