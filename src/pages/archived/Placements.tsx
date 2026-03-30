import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronDown, ChevronUp, CheckCircle, Eye } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { formatDateTime } from '../utils/dateFormat'

interface PlacementData {
  id: string
  candidate_name: string
  client_name: string
  placement_date: string
  followup_reminders: FollowupReminder[]
  salary_reminders: SalaryReminder[]
}

interface FollowupReminder {
  id: string
  due_date: string
  completed_date: string | null
  satisfaction_rating: number | null
  issues: string | null
  completed_by: string | null
  staff_name?: string
}

interface SalaryReminder {
  id: string
  due_date: string
  completed_date: string | null
  salary_paid: boolean | null
  completed_by: string | null
  staff_name?: string
}

export function Placements() {
  const [placements, setPlacements] = useState<PlacementData[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPlacements, setExpandedPlacements] = useState<Set<string>>(new Set())
  const [completingFollowup, setCompletingFollowup] = useState<string | null>(null)
  const [completingSalary, setCompletingSalary] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState(5)
  const [salaryPaid, setSalaryPaid] = useState(true)
  const [viewingNotes, setViewingNotes] = useState<{id: string, notes: string, type: string} | null>(null)
  const [followupSearch, setFollowupSearch] = useState('')
  const [salarySearch, setSalarySearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [editingPlacement, setEditingPlacement] = useState<{id: string, date: string, status: string} | null>(null)

  const { showToast } = useToast()
  const { staff } = useAuth()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: placementsData, error } = await supabase
        .from('placements')
        .select(`
          id,
          placement_date,
          status,
          candidates(name),
          clients(name)
        `)
        .in('status', ['ACTIVE', 'SUCCESS', 'LOST'])
        .order('placement_date', { ascending: false })

      if (error) throw error

      const { data: followupsData, error: followupsError } = await supabase
        .from('placement_followups')
        .select(`
          id,
          placement_id,
          followup_type,
          due_date,
          completed_date,
          satisfaction_rating,
          issues,
          salary_paid,
          updated_by,
          completed_by_username,
          staff!updated_by(username)
        `)
        .in('placement_id', placementsData?.map(p => p.id) || [])
      
      console.log('Placements data:', placementsData)
      console.log('Followups data:', followupsData)

      const formattedPlacements = (placementsData || []).map(p => {
        const placementFollowups = followupsData?.filter(f => f.placement_id === p.id) || []
        
        return {
          id: p.id,
          candidate_name: p.candidates?.name || 'Unknown',
          client_name: p.clients?.name || 'Unknown',
          placement_date: p.placement_date,
          status: p.status,
          followup_reminders: placementFollowups
            .filter(f => f.followup_type === '2_week')
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
            .map(f => ({
              id: f.id,
              due_date: f.due_date,
              completed_date: f.completed_date,
              satisfaction_rating: f.satisfaction_rating,
              issues: f.issues,
              completed_by: f.updated_by,
              staff_name: f.completed_by_username || f.staff?.username || 'FB'
            })),
          salary_reminders: placementFollowups
            .filter(f => f.followup_type === 'salary')
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
            .map(f => ({
              id: f.id,
              due_date: f.due_date,
              completed_date: f.completed_date,
              salary_paid: f.salary_paid,
              completed_by: f.updated_by,
              staff_name: f.completed_by_username || f.staff?.username || 'FB'
            }))
        }
      })

      setPlacements(formattedPlacements)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (placementId: string) => {
    const newExpanded = new Set(expandedPlacements)
    if (newExpanded.has(placementId)) {
      newExpanded.delete(placementId)
    } else {
      newExpanded.add(placementId)
    }
    setExpandedPlacements(newExpanded)
  }

  const completeFollowup = async (followupId: string, placementId: string) => {
    if (!notes.trim()) {
      showToast('Notes are required', 'error')
      return
    }

    try {
      const { error } = await supabase
        .from('placement_followups')
        .update({
          completed_date: new Date().toISOString(),
          satisfaction_rating: rating,
          issues: notes,
          updated_by: staff?.id,
          completed_by_username: staff?.username
        })
        .eq('id', followupId)

      if (error) throw error

      await loadData()
      setCompletingFollowup(null)
      setNotes('')
      setRating(5)
      showToast('Follow-up completed', 'success')
    } catch (error) {
      console.error('Error:', error)
      showToast('Failed to complete follow-up', 'error')
    }
  }

  const completeSalary = async (salaryId: string, placementId: string) => {
    try {
      const { error } = await supabase
        .from('placement_followups')
        .update({
          completed_date: new Date().toISOString(),
          salary_paid: salaryPaid,
          updated_by: staff?.id,
          completed_by_username: staff?.username
        })
        .eq('id', salaryId)

      if (error) throw error

      await loadData()
      setCompletingSalary(null)
      setSalaryPaid(true)
      showToast('Salary reminder completed', 'success')
    } catch (error) {
      console.error('Error:', error)
      showToast('Failed to complete salary reminder', 'error')
    }
  }

  const getCompletedCount = (reminders: any[]) => {
    return reminders.filter(r => r.completed_date).length
  }

  const getDueDateBadge = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays)
      return (
        <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
          {overdueDays}d overdue
        </span>
      )
    } else if (diffDays === 0) {
      return (
        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
          Due today
        </span>
      )
    } else if (diffDays <= 7) {
      return (
        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
          {diffDays}d remaining
        </span>
      )
    } else if (diffDays <= 30) {
      return (
        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
          {diffDays}d remaining
        </span>
      )
    } else {
      const months = Math.floor(diffDays / 30)
      const days = diffDays % 30
      return (
        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
          {months}m {days}d remaining
        </span>
      )
    }
  }

  const filteredFollowupPlacements = placements.filter(p => {
    const matchesSearch = p.client_name.toLowerCase().includes(followupSearch.toLowerCase()) ||
                         p.candidate_name.toLowerCase().includes(followupSearch.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredSalaryPlacements = placements.filter(p => {
    const matchesSearch = p.client_name.toLowerCase().includes(salarySearch.toLowerCase()) ||
                         p.candidate_name.toLowerCase().includes(salarySearch.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const updatePlacementStatus = async (placementId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('placements')
        .update({ status: newStatus, updated_by: staff?.id })
        .eq('id', placementId)
      
      if (error) throw error
      await loadData()
      showToast(`Placement marked as ${newStatus}`, 'success')
    } catch (error) {
      console.error('Error updating placement status:', error)
      showToast('Failed to update placement status', 'error')
    }
  }

  const getSuccessRate = (reminders: any[]) => {
    const completed = reminders.filter(r => r.completed_date && r.satisfaction_rating)
    if (completed.length === 0) return 0
    const avgRating = completed.reduce((sum, r) => sum + r.satisfaction_rating, 0) / completed.length
    return Math.round((avgRating / 5) * 100)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow h-20"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Placements</h1>
        <p className="text-gray-600">Manage follow-up and salary reminders</p>
      </div>

      {/* Follow-up Reminders Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Follow-up Reminders</h2>
            <div className="flex items-center space-x-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUCCESS">Success</option>
                <option value="LOST">Lost</option>
              </select>
              <input
                type="text"
                placeholder="Search placements..."
                value={followupSearch}
                onChange={(e) => setFollowupSearch(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm w-64"
              />
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredFollowupPlacements.map((placement, placementIndex) => {
            const isExpanded = expandedPlacements.has(placement.id)
            const completedCount = getCompletedCount(placement.followup_reminders)
            
            return (
              <div key={placement.id} className="p-4">
                <div 
                  className="relative cursor-pointer hover:bg-gray-50 p-4 rounded min-h-[80px]"
                  onClick={() => toggleExpanded(placement.id)}
                >
                  <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full font-bold ${
                    placement.status === 'ACTIVE' ? 'bg-green-600 text-white' :
                    placement.status === 'SUCCESS' ? 'bg-blue-600 text-white' :
                    'bg-red-600 text-white'
                  }`}>
                    {placement.status}
                  </span>
                  <div className="flex items-center space-x-4 pr-20">
                    <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      #{placementIndex + 1}
                    </span>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {placement.client_name} - {placement.candidate_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Started: {formatDateTime(placement.placement_date + 'T00:00:00')}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-blue-600">
                      {completedCount}/6
                    </span>
                  </div>
                  <div className="absolute bottom-2 right-2 flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {getSuccessRate(placement.followup_reminders)}% success
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="mt-4 space-y-3 pl-4">
                    {placement.followup_reminders.length === 0 ? (
                      <div className="p-3 bg-yellow-50 rounded text-sm text-yellow-700">
                        No follow-up reminders found. Check if placement_followups were created properly.
                      </div>
                    ) : (
                      placement.followup_reminders.map((reminder, index) => (
                        <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex items-center space-x-3">
                            {reminder.completed_date ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                            )}
                            <div>
                              <p className="text-sm font-medium">Check #{index + 1}</p>
                              <div className="flex items-center space-x-2">
                                <p className="text-xs text-gray-500">
                                  Due: {formatDateTime(reminder.due_date + 'T00:00:00')}
                                </p>
                                {!reminder.completed_date && getDueDateBadge(reminder.due_date)}
                              </div>
                              {reminder.completed_date && (
                                <div className="mt-1 text-xs text-gray-600">
                                  <p>Completed: {formatDateTime(reminder.completed_date)}</p>
                                  <p>By: {reminder.staff_name || 'FB'}</p>
                                  <p>Rating: {reminder.satisfaction_rating}/5</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {reminder.completed_date && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (reminder.issues) {
                                    setViewingNotes({id: reminder.id, notes: reminder.issues, type: 'Follow-up'})
                                  }
                                }}
                                className={reminder.issues ? 'text-blue-600 hover:text-blue-800' : 'text-gray-300 cursor-not-allowed'}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            {!reminder.completed_date && (
                              <div onClick={(e) => e.stopPropagation()}>
                                {completingFollowup === reminder.id ? (
                                  <div className="space-y-2">
                                    <select
                                      value={rating}
                                      onChange={(e) => setRating(parseInt(e.target.value))}
                                      className="text-xs px-2 py-1 border rounded"
                                    >
                                      <option value={5}>5 - Excellent</option>
                                      <option value={4}>4 - Good</option>
                                      <option value={3}>3 - Average</option>
                                      <option value={2}>2 - Poor</option>
                                      <option value={1}>1 - Very Poor</option>
                                    </select>
                                    <textarea
                                      value={notes}
                                      onChange={(e) => setNotes(e.target.value)}
                                      placeholder="Notes (required)"
                                      className="text-xs px-2 py-1 border rounded w-full"
                                      rows={2}
                                    />
                                    <div className="flex space-x-1">
                                      <button
                                        onClick={() => completeFollowup(reminder.id, placement.id)}
                                        className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                      >
                                        Complete
                                      </button>
                                      <button
                                        onClick={() => setCompletingFollowup(null)}
                                        className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setCompletingFollowup(reminder.id)}
                                    className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Mark Complete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Salary Reminders Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Salary Reminders</h2>
            <input
              type="text"
              placeholder="Search placements..."
              value={salarySearch}
              onChange={(e) => setSalarySearch(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm w-64"
            />
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredSalaryPlacements.map((placement, placementIndex) => {
            const isExpanded = expandedPlacements.has(`salary-${placement.id}`)
            const completedCount = getCompletedCount(placement.salary_reminders)
            
            return (
              <div key={`salary-${placement.id}`} className="p-4">
                <div 
                  className="relative cursor-pointer hover:bg-gray-50 p-4 rounded min-h-[80px]"
                  onClick={() => toggleExpanded(`salary-${placement.id}`)}
                >
                  <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full font-bold ${
                    placement.status === 'ACTIVE' ? 'bg-green-600 text-white' :
                    placement.status === 'SUCCESS' ? 'bg-blue-600 text-white' :
                    'bg-red-600 text-white'
                  }`}>
                    {placement.status}
                  </span>
                  <div className="flex items-center space-x-4 pr-20">
                    <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      #{placementIndex + 1}
                    </span>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {placement.client_name} - {placement.candidate_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Started: {formatDateTime(placement.placement_date + 'T00:00:00')}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-green-600">
                      {completedCount}/3
                    </span>
                  </div>
                  <div className="absolute bottom-2 right-2">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="mt-4 space-y-3 pl-4">
                    {placement.salary_reminders.length === 0 ? (
                      <div className="p-3 bg-yellow-50 rounded text-sm text-yellow-700">
                        No salary reminders found. Check if placement_followups were created properly.
                      </div>
                    ) : (
                      placement.salary_reminders.map((reminder, index) => (
                        <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex items-center space-x-3">
                            {reminder.completed_date ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                            )}
                            <div>
                              <p className="text-sm font-medium">Month {index + 1}</p>
                              <div className="flex items-center space-x-2">
                                <p className="text-xs text-gray-500">
                                  Due: {formatDateTime(reminder.due_date + 'T00:00:00')}
                                </p>
                                {!reminder.completed_date && getDueDateBadge(reminder.due_date)}
                              </div>
                              {reminder.completed_date && (
                                <div className="mt-1 text-xs text-gray-600">
                                  <p>Completed: {formatDateTime(reminder.completed_date)}</p>
                                  <p>By: {reminder.staff_name || 'FB'}</p>
                                  <p>Salary Paid: {reminder.salary_paid ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          {!reminder.completed_date && (
                            <div onClick={(e) => e.stopPropagation()}>
                              {completingSalary === reminder.id ? (
                                <div className="space-y-2">
                                  <div className="flex space-x-2">
                                    <label className="flex items-center text-xs">
                                      <input
                                        type="radio"
                                        checked={salaryPaid === true}
                                        onChange={() => setSalaryPaid(true)}
                                        className="mr-1"
                                      />
                                      Paid
                                    </label>
                                    <label className="flex items-center text-xs">
                                      <input
                                        type="radio"
                                        checked={salaryPaid === false}
                                        onChange={() => setSalaryPaid(false)}
                                        className="mr-1"
                                      />
                                      Not Paid
                                    </label>
                                  </div>
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => completeSalary(reminder.id, placement.id)}
                                      className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                    >
                                      Complete
                                    </button>
                                    <button
                                      onClick={() => setCompletingSalary(null)}
                                      className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setCompletingSalary(reminder.id)}
                                  className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  Mark Complete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Notes Viewing Modal */}
      {viewingNotes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {viewingNotes.type} Notes
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewingNotes.notes}</p>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => setViewingNotes(null)}
                  className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}