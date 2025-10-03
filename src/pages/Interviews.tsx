import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SearchFilter } from '../components/ui/SearchFilter'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Plus, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { ActivityLogger } from '../lib/activityLogger'

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

  // reschedule state
  const [reschedule, setReschedule] = useState<{ open: boolean; interview: Interview | null; dateTime: string }>(
    { open: false, interview: null, dateTime: '' }
  )

  const { user, staff } = useAuth()
  const { showToast } = useToast()

  const statusOptions = ['all', 'scheduled', 'won', 'lost'] // Include lost interviews for visibility
  const outcomeOptions = ['Won', 'Lost']

  useEffect(() => {
    Promise.all([loadInterviews(), loadScheduledCandidates()])
    
    // Set up realtime subscriptions for immediate updates
    const interviewsSubscription = supabase
      .channel('interviews-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interviews'
        },
        (payload) => {
          console.log('Interviews table change detected:', payload)
          loadInterviews()
        }
      )
      .subscribe()

    const candidatesSubscription = supabase
      .channel('candidates-changes-for-interviews')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'candidates'
        },
        (payload) => {
          console.log('Candidates table change detected:', payload)
          // Reload scheduled candidates when candidate status changes
          loadScheduledCandidates()
        }
      )
      .subscribe()
    
    // Set up an interval to check for interviews that need attention
    const checkInterviewsInterval = setInterval(() => {
      const now = new Date()
      setInterviews(prevInterviews => {
        return prevInterviews.map(interview => {
          const interviewDate = new Date(interview.date_time)
          if (!interview.attended && !interview.outcome && interviewDate < now) {
            // Mark as needing attention if time has passed
            return { ...interview, needsAttention: true }
          }
          return interview
        })
      })
    }, 60000) // Check every minute
    
    return () => {
      interviewsSubscription.unsubscribe()
      candidatesSubscription.unsubscribe()
      clearInterval(checkInterviewsInterval)
    }
  }, [])

  useEffect(() => {
    filterInterviews()
  }, [interviews, searchTerm, filterStatus, sortBy])

  const loadInterviews = async () => {
    try {
      showToast('Loading interviews...', 'loading')
      
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          *,
          candidates (name, phone, status)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Check for interviews that need attention (time has passed)
      const now = new Date()
      const updatedInterviews = data?.map(interview => {
        const interviewDate = new Date(interview.date_time)
        if (!interview.attended && !interview.outcome && interviewDate < now) {
          // Mark as needing attention if time has passed
          return { ...interview, needsAttention: true }
        }
        return interview
      }) || []
      
      setInterviews(updatedInterviews)
      showToast('Interviews loaded successfully', 'success')
    } catch (error) {
      console.error('Error loading interviews:', error)
      showToast('Failed to load interviews', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadScheduledCandidates = async () => {
    try {
      showToast('Loading candidates...', 'loading')
      const { data, error } = await supabase
        .from('candidates')
        .select('id, name')
        .eq('status', 'PENDING') // Only include PENDING candidates for scheduling
        .order('name')

      if (error) throw error
      setCandidates(data || [])
      showToast('Candidates loaded successfully', 'success')
    } catch (error) {
      console.error('Error loading pending candidates:', error)
      showToast('Failed to load candidates', 'error')
    }
  }

  const filterInterviews = () => {
    let filtered = [...interviews]

    if (searchTerm) {
      filtered = filtered.filter(interview =>
        // Optimize search by phone number too
        interview.candidates?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interview.candidates?.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (interview.outcome || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'scheduled') {
        filtered = filtered.filter(interview => !interview.attended && !interview.outcome)
      } else if (filterStatus === 'won') {
        filtered = filtered.filter(interview => interview.outcome === 'Won')
      } else if (filterStatus === 'lost') {
        filtered = filtered.filter(interview => interview.outcome === 'Lost')
      }
      // Removed other filter options as requested
    }

    filtered.sort((a, b) => {
      const av = (a as any)[sortBy] as string
      const bv = (b as any)[sortBy] as string
      return new Date(bv).getTime() - new Date(av).getTime()
    })

    setFilteredInterviews(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate candidate selection for new interviews
    if (!selectedInterview && !formData.candidate_id) {
      showToast('Please select a candidate', 'error')
      return
    }
    
    try {
      showToast(selectedInterview ? 'Updating interview...' : 'Scheduling interview...', 'loading')
      
      // Check for duplicate interviews when creating a new interview
      if (!selectedInterview && formData.candidate_id) {
        const { data: existingInterviews } = await supabase
          .from('interviews')
          .select('id')
          .eq('candidate_id', formData.candidate_id)
          .eq('status', 'scheduled')
        
        if (existingInterviews && existingInterviews.length > 0) {
          showToast('This candidate already has a scheduled interview', 'error')
          return
        }
      }
      
      if (selectedInterview) {
        // For existing interviews
        const { error } = await supabase
          .from('interviews')
          .update({
            ...formData,
            status: formData.outcome ? 'completed' : 'scheduled'
          })
          .eq('id', selectedInterview.id)
        if (error) throw error

        // Update candidate status based on outcome
        if (formData.outcome) {
          const candidateStatus = formData.outcome === 'Won' ? 'WON' : 'LOST'
          
          const { error: candidateError } = await supabase
            .from('candidates')
            .update({ status: candidateStatus })
            .eq('id', selectedInterview.candidate_id)
            
          if (candidateError) {
            console.error('Error updating candidate status:', candidateError)
            throw candidateError
          }
        }

        // Log the activity for interview update
        if (staff?.id && staff?.name) {
          const candidateName = selectedInterview.candidates?.name || 'Unknown Candidate'
          const actionDescription = formData.attended ? 
            (formData.outcome ? `marked ${candidateName} interview as ${formData.outcome}` : `marked ${candidateName} interview as attended`) :
            `updated ${candidateName} interview details`
          
          await ActivityLogger.log({
            userId: staff.id,
            actionType: 'edit',
            entityType: 'interview',
            entityId: selectedInterview.id,
            entityName: candidateName,
            description: `${staff.name} ${actionDescription}`
          })
        }
        
        showToast('Interview updated successfully', 'success')
      } else {
        // For new interviews, ensure time is set to 2:00 PM
        const dateOnly = formData.date_time
        const d = new Date(dateOnly)
        d.setHours(14, 0, 0, 0) // Set to 2:00 PM
        const isoDateTime = d.toISOString()
        
        const { error } = await supabase
          .from('interviews')
          .insert({
            candidate_id: formData.candidate_id,
            date_time: isoDateTime,
            location: 'Office',
            assigned_staff: user?.id,
            attended: false,
            outcome: null,
            notes: '',
            status: 'scheduled'
          })
        if (error) throw error
        
        // Update candidate status to INTERVIEW_SCHEDULED and set scheduled_date
        const { error: candidateError } = await supabase
          .from('candidates')
          .update({ 
            status: 'INTERVIEW_SCHEDULED',
            scheduled_date: isoDateTime
          })
          .eq('id', formData.candidate_id)
          
        if (candidateError) {
          console.error('Error updating candidate status:', candidateError)
          throw candidateError
        }
        
        await supabase.from('updates').insert({
          linked_to_type: 'interview',
          linked_to_id: formData.candidate_id,
          user_id: user?.id,
          update_text: `Interview scheduled for ${d.toDateString()} at 2:00 PM`,
        })
        
        showToast('Interview scheduled successfully', 'success')
      }

      // Refresh both interviews and candidate lists to ensure sync
      await Promise.all([loadInterviews(), loadScheduledCandidates()])
      setShowModal(false)
      resetForm()
    } catch (error) {
      console.error('Error saving interview:', error)
      showToast(`Failed to save interview: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }

  const resetForm = () => {
    setFormData({
      candidate_id: '',
      date_time: '',
      attended: false,
      outcome: '',
    })
    setCandidateSearch('')
    setShowCandidateDropdown(false)
    setSelectedInterview(null)
  }

  // Removed edit functionality as per requirements

  const getInterviewStatus = (interview: Interview) => {
    if (interview.attended && interview.outcome === 'Won') return 'won'
    if (interview.attended && interview.outcome === 'Lost') return 'lost'
    if (!interview.attended && interview.outcome === 'Lost') return 'lost' // Also show lost interviews that weren't attended
    if (!interview.attended && interview.outcome) return 'no-show'
    if (interview.needsAttention) return 'needs-attention'
    return 'scheduled'
  }

  const deleteInterview = async (interview: Interview) => {
    if (!confirm('Delete this interview?')) return
    try {
      showToast('Deleting interview...', 'loading')
      
      const { error } = await supabase.from('interviews').delete().eq('id', interview.id)
      if (error) throw error
      
      await supabase.from('updates').insert({
        linked_to_type: 'interview',
        linked_to_id: interview.id,
        user_id: user?.id,
        update_text: `Deleted interview for ${interview.candidates?.name || ''}`,
      })
      
      await loadInterviews()
      showToast('Interview deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting interview:', error)
      showToast('Failed to delete interview', 'error')
    }
  }

  // setPending function removed as we no longer use PENDING status

  const setOutcome = async (interview: Interview, outcome: 'Won' | 'Lost') => {
    try {
      showToast(`Setting outcome to ${outcome}...`, 'loading')
      
      // Update interview outcome
      const { error } = await supabase
        .from('interviews')
        .update({ attended: true, outcome })
        .eq('id', interview.id)
      if (error) throw error

      // Update candidate status
      const candidateStatus = outcome === 'Won' ? 'WON' : 'LOST'
      const { error: candidateError } = await supabase
        .from('candidates')
        .update({ status: candidateStatus })
        .eq('id', interview.candidate_id)
      
      if (candidateError) {
        console.error('Error updating candidate status:', candidateError)
        throw candidateError
      }

      // Add update record
      await supabase.from('updates').insert({
        linked_to_type: 'interview',
        linked_to_id: interview.id,
        user_id: user?.id,
        update_text: `Interview outcome set to ${outcome}`,
      })
      
      // Refresh data
      await Promise.all([loadInterviews(), loadScheduledCandidates()])
      showToast(`Interview outcome set to ${outcome}`, 'success')
    } catch (error) {
      console.error('Error setting outcome:', error)
      showToast(`Failed to update outcome: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }

  const openReschedule = (interview: Interview) => {
    setReschedule({ open: true, interview, dateTime: '' })
  }

  const confirmReschedule = async () => {
    if (!reschedule.interview || !reschedule.dateTime) return
    const interview = reschedule.interview
    try {
      // Reset interview status and outcome when rescheduling
      const updates = {
        date_time: reschedule.dateTime,
        status: 'scheduled',
        attended: false,
        outcome: null
      }
      showToast('Rescheduling interview...', 'loading')
      
      // Set time to 2:00 PM (14:00)
      const d = new Date(reschedule.dateTime)
      d.setHours(14, 0, 0, 0)
      const iso = d.toISOString()
      
      const { error } = await supabase
        .from('interviews')
        .update({ date_time: iso, attended: false, outcome: null })
        .eq('id', interview.id)
      if (error) throw error

      // Update candidate status to INTERVIEW_SCHEDULED
      const { error: candidateError } = await supabase
        .from('candidates')
        .update({ 
          status: 'INTERVIEW_SCHEDULED',
          scheduled_date: iso
        })
        .eq('id', interview.candidate_id)
      
      if (candidateError) {
        console.error('Error updating candidate status:', candidateError)
        throw candidateError
      }

      // Log the reschedule activity
      if (staff?.id && staff?.name) {
        await ActivityLogger.logReschedule(
          staff.id,
          'interview',
          interview.id,
          interview.candidate_name,
          interview.date_time,
          iso,
          staff.name
        )
      }

      await supabase.from('updates').insert({
        linked_to_type: 'interview',
        linked_to_id: interview.id,
        user_id: user?.id,
        update_text: `Interview rescheduled to ${formatDisplayDate(iso)} at 2:00 PM`,
      })

      setReschedule({ open: false, interview: null, dateTime: '' })
      await loadInterviews()
      showToast('Interview rescheduled successfully', 'success')
    } catch (error) {
      console.error('Error rescheduling interview:', error)
      showToast('Failed to reschedule interview', 'error')
    }
  }

  const now = useMemo(() => Date.now(), [])
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleString('default', { month: 'short' })
    const year = date.getFullYear()
    const dayOfWeek = date.toLocaleString('default', { weekday: 'short' })
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                   day === 2 || day === 22 ? 'nd' :
                   day === 3 || day === 23 ? 'rd' : 'th'
    return `${dayOfWeek} ${day}${suffix} ${month} ${year}`
  }

  const getCountdown = (interview: Interview) => {
    // Stop countdown for won/lost interviews
    if (interview.outcome === 'Won' || interview.outcome === 'Lost') {
      return '-'
    }
    
    const dateStr = interview.date_time
    const diffMs = new Date(dateStr).getTime() - Date.now()
    if (diffMs <= 0) return '-'
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    // If more than 24 hours, show days and hours
    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      return `${days}d ${remainingHours}h`
    }
    
    return `${hours}h ${minutes}m`
  }

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
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
          <p className="text-gray-600">Schedule and track candidate interviews</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Schedule Interview
        </button>
      </div>

      {/* Search, Filter, Sort */}
      <div className="flex flex-col gap-3">
      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        statusOptions={statusOptions}
        placeholder="Search by candidate name or outcome..."
      />
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="created_at">Date Added</option>
            <option value="date_time">Interview Date</option>
            <option value="scheduled_date">Date Scheduled</option>
          </select>
        </div>
      </div>

      {/* Interviews Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Countdown</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInterviews.map((interview, index) => (
                <tr key={interview.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                  <td className={`px-6 py-4 whitespace-nowrap ${
                    getInterviewStatus(interview) === 'won' ? 'bg-green-50' :
                    getInterviewStatus(interview) === 'lost' ? 'bg-red-50' :
                    getInterviewStatus(interview) === 'no-show' ? 'bg-red-50' :
                    ''
                  }`}>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{interview.candidates?.name}</div>
                      <div className="text-sm text-gray-500">{interview.candidates?.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{formatDisplayDate(interview.date_time)}</div>
                      <div className="text-gray-500">
                        {new Date(interview.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge 
                      status={getInterviewStatus(interview)} 
                      type="interview" 
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getCountdown(interview)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="relative inline-flex items-center gap-2">
                      <select
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === 'WON') setOutcome(interview, 'Won');
                          if (v === 'LOST') setOutcome(interview, 'Lost');
                          if (v === 'RESCHEDULE') openReschedule(interview);
                          e.currentTarget.selectedIndex = 0;
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                        defaultValue=""
                        title="Actions"
                      >
                        <option value="" disabled>Actions</option>
                        <option value="WON">Won</option>
                        <option value="LOST">Lost</option>
                        <option value="RESCHEDULE">Reschedule</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredInterviews.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No interviews found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by scheduling your first interview.'
            }
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedInterview ? 'Edit Interview' : 'Schedule New Interview'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Candidate</label>
                  {selectedInterview ? (
                    <input
                      type="text"
                      value={candidates.find(c => c.id === formData.candidate_id)?.name || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                    />
                  ) : (
                    <>
                      <input
                        type="text"
                        required
                        value={candidateSearch}
                        onChange={(e) => {
                          setCandidateSearch(e.target.value)
                          setShowCandidateDropdown(true)
                          // Clear selected candidate if search changes
                          if (formData.candidate_id) {
                            setFormData({ ...formData, candidate_id: '' })
                          }
                        }}
                        onFocus={() => setShowCandidateDropdown(true)}
                        onBlur={() => {
                          // Delay hiding dropdown to allow for clicks
                          setTimeout(() => setShowCandidateDropdown(false), 150)
                        }}
                        placeholder="Search pending candidates..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                      />
                      {showCandidateDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {candidates.length === 0 ? (
                            <div className="px-3 py-2 text-gray-500 text-sm">
                              No pending candidates available
                            </div>
                          ) : (
                            candidates
                              .filter(candidate => 
                                candidate.name.toLowerCase().includes(candidateSearch.toLowerCase())
                              )
                              .map(candidate => (
                                <div
                                  key={candidate.id}
                                  onClick={() => {
                                    setFormData({ ...formData, candidate_id: candidate.id })
                                    setCandidateSearch(candidate.name)
                                    setShowCandidateDropdown(false)
                                  }}
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm"
                                >
                                  {candidate.name}
                                </div>
                              ))
                          )}
                          {candidates.length > 0 && candidates.filter(candidate => 
                            candidate.name.toLowerCase().includes(candidateSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="px-3 py-2 text-gray-500 text-sm">
                              No candidates match your search
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date (Time will be set to 2:00 PM)</label>
                  <input
                    type="date"
                    required
                    value={formData.date_time}
                    onChange={(e) => {
                      // Create a date object and set time to 2:00 PM
                      const date = new Date(e.target.value);
                      date.setHours(14, 0, 0, 0);
                      setFormData({ ...formData, date_time: date.toISOString().split('T')[0] });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>



                {selectedInterview && (
                  <>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="attended"
                        checked={formData.attended}
                        onChange={(e) => setFormData({ ...formData, attended: e.target.checked })}
                        className="h-4 w-4 text-nestalk-primary focus:ring-nestalk-primary border-gray-300 rounded"
                      />
                      <label htmlFor="attended" className="ml-2 block text-sm font-medium text-gray-700">
                        Candidate attended
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
                      <select
                        value={formData.outcome}
                        onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                      >
                        <option value="">Select outcome</option>
                        {outcomeOptions.map(outcome => (
                          <option key={outcome} value={outcome}>{outcome}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors"
                  >
                    {selectedInterview ? 'Update' : 'Schedule'} Interview
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {reschedule.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setReschedule({ open: false, interview: null, dateTime: '' })}>
          <div className="bg-white rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Reschedule Interview</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Date (Time will be set to 2:00 PM)</label>
                  <input
                    type="date"
                    value={reschedule.dateTime}
                    onChange={(e) => setReschedule(prev => ({ ...prev, dateTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReschedule({ open: false, interview: null, dateTime: '' })}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmReschedule}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}