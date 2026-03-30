import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, FileText, Users, Calendar, CheckCircle, Clock, AlertCircle, DollarSign, BookOpen, UserCheck, UserX, UserMinus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

interface NicheCohort {
  id: string
  cohort_number: number
  start_date: string
  end_date: string
  status: 'upcoming' | 'active' | 'completed' | 'graduated'
  created_at: string
  trainee_count?: number
}

export function NicheCohorts() {
  const [cohorts, setCohorts] = useState<NicheCohort[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedCohort, setSelectedCohort] = useState<NicheCohort | null>(null)
  const [cohortReport, setCohortReport] = useState<any>(null)
  const [formData, setFormData] = useState({
    cohort_number: '',
    start_date: '',
    end_date: '',
    status: 'upcoming' as 'upcoming' | 'active' | 'completed' | 'graduated'
  })

  const { user, staff } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    loadCohorts()
  }, [])

  const loadCohorts = async () => {
    try {
      // Get cohorts with trainee count
      const { data: cohortsData, error: cohortsError } = await supabase
        .from('niche_cohorts')
        .select('*')
        .order('cohort_number')

      if (cohortsError) throw cohortsError

      // Get trainee counts for each cohort
      const cohortsWithCounts = await Promise.all(
        (cohortsData || []).map(async (cohort) => {
          const { count } = await supabase
            .from('niche_training')
            .select('*', { count: 'exact', head: true })
            .eq('cohort_id', cohort.id)
          
          return { ...cohort, trainee_count: count || 0 }
        })
      )

      setCohorts(cohortsWithCounts)
    } catch (error) {
      console.error('Error loading cohorts:', error)
      showToast('Failed to load cohorts', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const payload = {
        cohort_number: parseInt(formData.cohort_number),
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status
      }

      if (selectedCohort) {
        const { error } = await supabase
          .from('niche_cohorts')
          .update(payload)
          .eq('id', selectedCohort.id)

        if (error) throw error
        showToast('Cohort updated successfully', 'success')
      } else {
        const { error } = await supabase
          .from('niche_cohorts')
          .insert(payload)

        if (error) throw error
        showToast('Cohort created successfully', 'success')
      }

      setShowModal(false)
      resetForm()
      loadCohorts()
    } catch (error: any) {
      console.error('Error saving cohort:', error)
      showToast(`Error: ${error?.message || 'Unknown error'}`, 'error')
    }
  }

  const resetForm = () => {
    setFormData({
      cohort_number: '',
      start_date: '',
      end_date: '',
      status: 'upcoming'
    })
    setSelectedCohort(null)
  }

  const handleEdit = (cohort: NicheCohort) => {
    setSelectedCohort(cohort)
    setFormData({
      cohort_number: cohort.cohort_number.toString(),
      start_date: cohort.start_date,
      end_date: cohort.end_date,
      status: cohort.status
    })
    setShowModal(true)
  }

  const generateReport = async (cohort: NicheCohort) => {
    try {
      setSelectedCohort(cohort)
      
      // Get trainees with their details
      const { data: trainees } = await supabase
        .from('niche_training')
        .select(`
          *,
          niche_fees(course_fee, total_paid, sponsored_amount, payment_status)
        `)
        .eq('cohort_id', cohort.id)
      
      console.log('Trainees data:', trainees)
      
      // Get all payments for this cohort
      const { data: payments } = await supabase
        .from('niche_payments')
        .select(`
          amount, payment_method, payment_date,
          niche_fees!inner(
            niche_training!inner(cohort_id)
          )
        `)
        .eq('niche_fees.niche_training.cohort_id', cohort.id)
      
      // Get course breakdown
      const courseBreakdown = trainees?.reduce((acc: any, trainee: any) => {
        const courses = trainee.enrolled_courses || [trainee.course].filter(Boolean)
        courses.forEach((course: string) => {
          if (!acc[course]) acc[course] = 0
          acc[course]++
        })
        return acc
      }, {}) || {}
      
      // Calculate financial summary
      const financialSummary = trainees?.reduce((acc: any, trainee: any) => {
        const fees = trainee.niche_fees?.[0] // Get first fee record
        if (fees) {
          acc.totalFees += fees.course_fee || 0
          acc.totalPaid += fees.total_paid || 0
          acc.totalSponsored += fees.sponsored_amount || 0
        }
        return acc
      }, { totalFees: 0, totalPaid: 0, totalSponsored: 0 }) || { totalFees: 0, totalPaid: 0, totalSponsored: 0 }
      
      console.log('Financial summary:', financialSummary)
      
      // Payment method breakdown
      const paymentMethods = payments?.reduce((acc: any, payment: any) => {
        const method = payment.payment_method || 'Unknown'
        if (!acc[method]) acc[method] = { count: 0, amount: 0 }
        acc[method].count++
        acc[method].amount += payment.amount || 0
        return acc
      }, {}) || {}
      
      // Status breakdown
      const statusBreakdown = trainees?.reduce((acc: any, trainee: any) => {
        const status = trainee.status || 'Unknown'
        if (!acc[status]) acc[status] = 0
        acc[status]++
        return acc
      }, {}) || {}
      
      setCohortReport({
        cohort,
        trainees: trainees || [],
        courseBreakdown,
        financialSummary,
        paymentMethods,
        statusBreakdown,
        totalTrainees: trainees?.length || 0
      })
      
      setShowReportModal(true)
    } catch (error) {
      console.error('Error generating report:', error)
      showToast('Failed to generate report', 'error')
    }
  }

  const createNextCohorts = async () => {
    try {
      await supabase.rpc('update_cohort_statuses')
      const { data, error } = await supabase.rpc('create_next_cohorts', { num_cohorts: 5 })
      
      if (error) throw error
      
      showToast(`Created ${data?.length || 5} new cohorts successfully`, 'success')
      loadCohorts()
    } catch (error: any) {
      console.error('Error creating cohorts:', error)
      showToast(`Error: ${error?.message || 'Failed to create cohorts'}`, 'error')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'completed': return <AlertCircle className="w-5 h-5 text-gray-500" />
      case 'graduated': return <UserCheck className="w-5 h-5 text-emerald-500" />
      default: return <Clock className="w-5 h-5 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'completed': return 'bg-gray-100 text-gray-600 border-gray-200'
      case 'graduated': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  const getRomanNumeral = (num: number) => {
    const romanNumerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
    return romanNumerals[num] || num.toString()
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NICHE Cohorts</h1>
          <p className="text-gray-600">Manage training cohorts and schedules</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={createNextCohorts}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Next Cohorts
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cohorts.filter(cohort => cohort.status !== 'upcoming').map((cohort) => (
          <div key={cohort.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  {getStatusIcon(cohort.status)}
                  <h3 className="text-lg font-semibold text-gray-900 ml-2">
                    Cohort {getRomanNumeral(cohort.cohort_number)}
                  </h3>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(cohort.status)}`}>
                  {cohort.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>
                    {new Date(cohort.start_date).toLocaleDateString()} - {new Date(cohort.end_date).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  <span>{cohort.trainee_count || 0} trainees</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => generateReport(cohort)}
                  className="w-full flex items-center justify-center px-3 py-2 text-sm text-nestalk-primary hover:bg-nestalk-primary/10 rounded-lg transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Report
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {cohorts.filter(cohort => cohort.status !== 'upcoming').length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No cohorts found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first cohort.
          </p>
        </div>
      )}

      {/* Cohort Report Modal */}
      {showReportModal && cohortReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8" style={{ fontFamily: 'Arial, sans-serif', width: '210mm', minHeight: '297mm', margin: '0 auto' }} data-report-content>
              {/* Header */}
              <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Nestara Institute of Care and Hospitality Excellence</h1>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Cohort {getRomanNumeral(cohortReport.cohort.cohort_number)}</h2>
                <div className="text-gray-600 text-lg">
                  <p className="mb-1">{new Date(cohortReport.cohort.start_date).toLocaleDateString()} - {new Date(cohortReport.cohort.end_date).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 text-center shadow-sm">
                  <div className="text-3xl font-bold text-blue-900 mb-2">{cohortReport.totalTrainees}</div>
                  <div className="text-sm font-medium text-blue-700 uppercase tracking-wide">Total Trainees</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 text-center shadow-sm">
                  <div className="text-3xl font-bold text-green-900 mb-2">KSh {cohortReport.financialSummary.totalPaid.toLocaleString()}</div>
                  <div className="text-sm font-medium text-green-700 uppercase tracking-wide">Total Paid</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 text-center shadow-sm">
                  <div className="text-3xl font-bold text-purple-900 mb-2">KSh {cohortReport.financialSummary.totalSponsored.toLocaleString()}</div>
                  <div className="text-sm font-medium text-purple-700 uppercase tracking-wide">Total Sponsored</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 text-center shadow-sm">
                  <div className="text-3xl font-bold text-orange-900 mb-2">KSh {(cohortReport.financialSummary.totalFees - cohortReport.financialSummary.totalPaid - cohortReport.financialSummary.totalSponsored).toLocaleString()}</div>
                  <div className="text-sm font-medium text-orange-700 uppercase tracking-wide">Outstanding Balance</div>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="mb-10">
                <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-300">
                  Trainee Status Overview
                </h3>
                <div className="flex justify-between gap-2">
                  <div className="bg-white border-2 border-gray-200 p-3 rounded-lg text-center shadow-sm flex-1">
                    <div className="text-xl font-bold text-gray-900 mb-1">{cohortReport.statusBreakdown.Active || 0}</div>
                    <div className="text-xs font-semibold text-gray-600">Active</div>
                  </div>
                  <div className="bg-white border-2 border-gray-200 p-3 rounded-lg text-center shadow-sm flex-1">
                    <div className="text-xl font-bold text-gray-900 mb-1">{cohortReport.statusBreakdown.Pending || 0}</div>
                    <div className="text-xs font-semibold text-gray-600">Pending</div>
                  </div>
                  <div className="bg-white border-2 border-gray-200 p-3 rounded-lg text-center shadow-sm flex-1">
                    <div className="text-xl font-bold text-gray-900 mb-1">{cohortReport.statusBreakdown.Graduated || 0}</div>
                    <div className="text-xs font-semibold text-gray-600">Graduated</div>
                  </div>
                  <div className="bg-white border-2 border-gray-200 p-3 rounded-lg text-center shadow-sm flex-1">
                    <div className="text-xl font-bold text-gray-900 mb-1">{cohortReport.statusBreakdown.Expelled || 0}</div>
                    <div className="text-xs font-semibold text-gray-600">Expelled</div>
                  </div>
                </div>
              </div>

              {/* Course Breakdown */}
              <div className="mb-10">
                <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-300">
                  Course Enrollment Distribution
                </h3>
                <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
                  {Object.entries(cohortReport.courseBreakdown).map(([course, count]: [string, any]) => (
                    <div key={course} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                      <span className="text-gray-800 font-medium">{course}</span>
                      <span className="font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-full">{count} trainees</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="mb-10">
                <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-300">
                  Payment Method Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border-2 border-gray-200 p-6 rounded-lg shadow-sm">
                    <div className="font-bold text-lg text-gray-900 mb-2">Cash</div>
                    <div className="text-sm text-gray-600 mb-1">{cohortReport.paymentMethods.Cash?.count || 0} transactions</div>
                    <div className="text-2xl font-bold text-green-600">KSh {(cohortReport.paymentMethods.Cash?.amount || 0).toLocaleString()}</div>
                  </div>
                  <div className="bg-white border-2 border-gray-200 p-6 rounded-lg shadow-sm">
                    <div className="font-bold text-lg text-gray-900 mb-2">M-Pesa</div>
                    <div className="text-sm text-gray-600 mb-1">{cohortReport.paymentMethods['M-Pesa']?.count || 0} transactions</div>
                    <div className="text-2xl font-bold text-green-600">KSh {(cohortReport.paymentMethods['M-Pesa']?.amount || 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="mb-10">
                <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-300">Financial Performance Summary</h3>
                <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-600 mb-1">Total Course Fees</div>
                      <div className="text-2xl font-bold text-gray-900">KSh {cohortReport.financialSummary.totalFees.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-600 mb-1">Collection Rate</div>
                      <div className="text-2xl font-bold text-green-600">
                        {cohortReport.financialSummary.totalFees > 0 
                          ? Math.round((cohortReport.financialSummary.totalPaid / cohortReport.financialSummary.totalFees) * 100)
                          : 0}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-600 mb-1">Sponsorship Rate</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {cohortReport.financialSummary.totalFees > 0 
                          ? Math.round((cohortReport.financialSummary.totalSponsored / cohortReport.financialSummary.totalFees) * 100)
                          : 0}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-16 bg-gray-900 text-white p-6 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="text-sm">Report Generated: {new Date().toLocaleDateString()}</div>
                  <div className="text-sm font-medium">Confidential for Nestara Limited</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end items-center pt-6 border-t">
                <button
                  onClick={() => {
                    setShowReportModal(false)
                    setCohortReport(null)
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedCohort ? 'Edit Cohort' : 'Add Cohort'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cohort Number *</label>
                  <input
                    type="number"
                    required
                    value={formData.cohort_number}
                    onChange={(e) => setFormData({ ...formData, cohort_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="graduated">Graduated</option>
                  </select>
                </div>

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
                    {selectedCohort ? 'Update' : 'Create'} Cohort
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}