import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar, Clock, DollarSign, User, CheckCircle, XCircle, AlertTriangle, Phone } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { formatDateTime } from '../utils/dateFormat'
import { ActivityLogger } from '../lib/activityLogger'

interface Placement {
  id: string
  candidate_id: string
  client_id: string
  placement_date: string
  salary_amount: number | null
  status: string
  replacement_number: number
  notes: string
  candidate_name: string
  client_name: string
  candidate_phone: string
}

interface PlacementFollowup {
  id: string
  placement_id: string
  followup_type: string
  due_date: string
  completed_date: string | null
  satisfaction_rating: number | null
  issues: string | null
  salary_paid: boolean | null
  placement: {
    candidate_name: string
    client_name: string
    candidate_phone: string
  }
}

export function Placements() {
  const [placements, setPlacements] = useState<Placement[]>([])
  const [followups, setFollowups] = useState<PlacementFollowup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFollowup, setSelectedFollowup] = useState<PlacementFollowup | null>(null)
  const [showFollowupModal, setShowFollowupModal] = useState(false)
  const [satisfactionRating, setSatisfactionRating] = useState<number>(5)
  const [issues, setIssues] = useState('')
  const [salaryPaid, setSalaryPaid] = useState<boolean>(true)

  const { showToast } = useToast()
  const { staff } = useAuth()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [placementsRes, followupsRes] = await Promise.all([
        supabase
          .from('placements')
          .select(`
            *,
            candidates(name, phone),
            clients(name)
          `)
          .eq('status', 'ACTIVE')
          .order('placement_date', { ascending: false }),
        supabase
          .from('placement_followups')
          .select(`
            *,
            placements(
              candidates(name, phone),
              clients(name)
            )
          `)
          .is('completed_date', null)
          .order('due_date', { ascending: true })
      ])

      const placementsWithNames = (placementsRes.data || []).map(p => ({
        ...p,
        candidate_name: p.candidates?.name || 'Unknown',
        candidate_phone: p.candidates?.phone || '',
        client_name: p.clients?.name || 'Unknown'
      }))

      const followupsWithNames = (followupsRes.data || []).map(f => ({
        ...f,
        placement: {
          candidate_name: f.placements?.candidates?.name || 'Unknown',
          candidate_phone: f.placements?.candidates?.phone || '',
          client_name: f.placements?.clients?.name || 'Unknown'
        }
      }))

      setPlacements(placementsWithNames)
      setFollowups(followupsWithNames)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteFollowup = async () => {
    if (!selectedFollowup) return

    try {
      const updateData: any = {
        completed_date: new Date().toISOString(),
        updated_by: staff?.id
      }

      if (selectedFollowup.followup_type === '2_week') {
        updateData.satisfaction_rating = satisfactionRating
        updateData.issues = issues || null
      } else if (selectedFollowup.followup_type === 'monthly') {
        updateData.salary_paid = salaryPaid
      }

      const { error } = await supabase
        .from('placement_followups')
        .update(updateData)
        .eq('id', selectedFollowup.id)

      if (error) throw error

      // Log follow-up completion
      await ActivityLogger.log({
        userId: staff?.id || '',
        actionType: 'edit',
        entityType: 'client',
        entityId: selectedFollowup.placement_id,
        entityName: selectedFollowup.placement.candidate_name,
        description: `${selectedFollowup.followup_type === '2_week' ? '2-week' : 'Monthly'} follow-up completed for ${selectedFollowup.placement.candidate_name}${selectedFollowup.followup_type === '2_week' ? ` (Rating: ${satisfactionRating}/5)` : ` (Salary paid: ${salaryPaid ? 'Yes' : 'No'})`}`
      })

      await loadData()
      setShowFollowupModal(false)
      setSelectedFollowup(null)
      setSatisfactionRating(5)
      setIssues('')
      setSalaryPaid(true)
      showToast('Follow-up completed successfully', 'success')
    } catch (error) {
      console.error('Error completing follow-up:', error)
      showToast('Failed to complete follow-up', 'error')
    }
  }

  const getFollowupStatus = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'overdue'
    if (diffDays === 0) return 'due_today'
    if (diffDays <= 3) return 'due_soon'
    return 'upcoming'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200'
      case 'due_today': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'due_soon': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'overdue': return 'OVERDUE'
      case 'due_today': return 'DUE TODAY'
      case 'due_soon': return 'DUE SOON'
      default: return 'UPCOMING'
    }
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

  const overdueFollowups = followups.filter(f => getFollowupStatus(f.due_date) === 'overdue')
  const dueTodayFollowups = followups.filter(f => getFollowupStatus(f.due_date) === 'due_today')
  const upcomingFollowups = followups.filter(f => ['due_soon', 'upcoming'].includes(getFollowupStatus(f.due_date)))

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Placements</h1>
        <p className="text-gray-600">Track all placed candidates and manage follow-ups</p>
      </div>

      {/* Follow-up Alerts */}
      {(overdueFollowups.length > 0 || dueTodayFollowups.length > 0) && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="text-sm font-medium text-yellow-800">Follow-up Reminders</h3>
          </div>
          <div className="space-y-2">
            {[...overdueFollowups, ...dueTodayFollowups].slice(0, 5).map(followup => (
              <div key={followup.id} className="flex items-center justify-between text-sm">
                <span className="text-yellow-700">
                  {followup.placement.candidate_name} - {followup.placement.client_name} 
                  ({followup.followup_type === '2_week' ? '2-Week Check' : 'Monthly Salary'})
                  - {getStatusText(getFollowupStatus(followup.due_date))}
                </span>
                <button
                  onClick={() => {
                    setSelectedFollowup(followup)
                    setShowFollowupModal(true)
                  }}
                  className="text-yellow-600 hover:text-yellow-800 text-xs px-2 py-1 border border-yellow-300 rounded"
                >
                  Complete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Placements */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Placements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {placements.map((placement) => (
            <div key={placement.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900">{placement.candidate_name}</h3>
                  <p className="text-xs text-gray-500 flex items-center mt-1">
                    <Phone className="w-3 h-3 mr-1" />
                    {placement.candidate_phone}
                  </p>
                </div>
                {placement.replacement_number > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Replacement #{placement.replacement_number}
                  </span>
                )}
              </div>
              
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center">
                  <User className="w-3 h-3 mr-2" />
                  <span>Client: {placement.client_name}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-2" />
                  <span>Started: {formatDateTime(placement.placement_date + 'T00:00:00')}</span>
                </div>
                {placement.salary_amount && (
                  <div className="flex items-center">
                    <DollarSign className="w-3 h-3 mr-2" />
                    <span>Salary: ${placement.salary_amount.toLocaleString()}</span>
                  </div>
                )}
              </div>
              
              {placement.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-600">{placement.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Follow-up Schedule */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Follow-up Schedule</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {followups.map((followup) => {
                  const status = getFollowupStatus(followup.due_date)
                  return (
                    <tr key={followup.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{followup.placement.candidate_name}</div>
                        <div className="text-sm text-gray-500">{followup.placement.candidate_phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {followup.placement.client_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {followup.followup_type === '2_week' ? '2-Week Check' : 'Monthly Salary'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(followup.due_date + 'T00:00:00')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(status)}`}>
                          {getStatusText(status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedFollowup(followup)
                            setShowFollowupModal(true)
                          }}
                          className="text-nestalk-primary hover:text-nestalk-primary/80"
                        >
                          Complete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Follow-up Completion Modal */}
      {showFollowupModal && selectedFollowup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Complete Follow-up
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Candidate:</strong> {selectedFollowup.placement.candidate_name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Client:</strong> {selectedFollowup.placement.client_name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Type:</strong> {selectedFollowup.followup_type === '2_week' ? '2-Week Check' : 'Monthly Salary Tracking'}
                </p>
              </div>

              {selectedFollowup.followup_type === '2_week' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Satisfaction Rating (1-5)
                    </label>
                    <select
                      value={satisfactionRating}
                      onChange={(e) => setSatisfactionRating(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    >
                      <option value={5}>5 - Excellent</option>
                      <option value={4}>4 - Good</option>
                      <option value={3}>3 - Average</option>
                      <option value={2}>2 - Poor</option>
                      <option value={1}>1 - Very Poor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issues (if any)</label>
                    <textarea
                      value={issues}
                      onChange={(e) => setIssues(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                      placeholder="Any issues or concerns..."
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salary Payment Status
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={salaryPaid === true}
                        onChange={() => setSalaryPaid(true)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Salary Paid</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={salaryPaid === false}
                        onChange={() => setSalaryPaid(false)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Salary Not Paid</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex space-x-4 mt-6">
                <button
                  onClick={handleCompleteFollowup}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Complete Follow-up
                </button>
                <button
                  onClick={() => {
                    setShowFollowupModal(false)
                    setSelectedFollowup(null)
                    setSatisfactionRating(5)
                    setIssues('')
                    setSalaryPaid(true)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}