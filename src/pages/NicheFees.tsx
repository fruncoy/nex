import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SearchFilter } from '../components/ui/SearchFilter'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Plus, DollarSign, CreditCard, Eye, UserPlus, Edit } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { ActivityLogger } from '../lib/activityLogger'
import { formatDateTime } from '../utils/dateFormat'

interface NicheFee {
  id: string
  training_id: string
  course_fee: number
  payment_plan: 'Full' | 'Installments'
  total_paid: number
  balance_due: number
  payment_status: 'Pending' | 'Partial' | 'Paid' | 'Overdue'
  created_at: string
  updated_at: string
  // Joined data
  student_name: string
  student_phone: string
  course_name: string
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  reference_number?: string
  notes?: string
  created_by?: string
  created_at: string
}

interface ActiveStudent {
  id: string
  name: string
  phone: string
  course: string
  course_fee?: number
}

export function NicheFees() {
  const [fees, setFees] = useState<NicheFee[]>([])
  const [filteredFees, setFilteredFees] = useState<NicheFee[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showPaymentHistory, setShowPaymentHistory] = useState(false)
  const [selectedFee, setSelectedFee] = useState<NicheFee | null>(null)

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'Cash',
    reference_number: '',
    notes: ''
  })

  const { user, staff } = useAuth()
  const { showToast } = useToast()

  const statusOptions = ['all', 'Pending', 'Partial', 'Paid', 'Overdue']

  useEffect(() => {
    loadFees()
  }, [])

  useEffect(() => {
    filterFees()
  }, [fees, searchTerm, filterStatus])

  const loadFees = async () => {
    try {
      // Get all active students with course fees
      const { data: activeStudents, error: studentsError } = await supabase
        .from('niche_training')
        .select(`
          id,
          name,
          phone,
          course
        `)
        .eq('status', 'Active')

      if (studentsError) throw studentsError

      // Get course fees
      const { data: courses } = await supabase
        .from('niche_courses')
        .select('name, cost_kes')

      const courseMap = courses?.reduce((acc, course) => {
        acc[course.name] = course.cost_kes
        return acc
      }, {} as Record<string, number>) || {}
      
      console.log('Active students:', activeStudents)
      console.log('Course map:', courseMap)

      // Get existing fee records for Active students only
      const { data: existingFees, error: feesError } = await supabase
        .from('niche_fees')
        .select(`
          *,
          niche_training!inner(name, phone, course, status)
        `)
        .eq('niche_training.status', 'Active')
        .order('niche_training(name)', { ascending: true })

      if (feesError) throw feesError

      // Create fee records for students without existing records
      const existingTrainingIds = existingFees?.map(f => f.training_id) || []
      const studentsNeedingFees = activeStudents?.filter(s => !existingTrainingIds.includes(s.id)) || []

      if (studentsNeedingFees.length > 0) {
        const newFeeRecords = studentsNeedingFees.map(student => {
          const courseFee = courseMap[student.course] || 0
          console.log(`Student: ${student.name}, Course: ${student.course}, Fee: ${courseFee}`)
          return {
            training_id: student.id,
            course_fee: courseFee,
            payment_plan: 'Full'
          }
        })

        const { error: insertError } = await supabase
          .from('niche_fees')
          .insert(newFeeRecords)

        if (insertError) throw insertError

        // Reload fees after inserting new records - only Active students
        const { data: updatedFees, error: updatedError } = await supabase
          .from('niche_fees')
          .select(`
            *,
            niche_training!inner(name, phone, course, status)
          `)
          .eq('niche_training.status', 'Active')
          .order('niche_training(name)', { ascending: true })

        if (updatedError) throw updatedError
        
        const formattedFees = updatedFees?.map(fee => ({
          ...fee,
          student_name: fee.niche_training.name,
          student_phone: fee.niche_training.phone,
          course_name: fee.niche_training.course || 'No Course'
        })) || []

        setFees(formattedFees)
      } else {
        const formattedFees = existingFees?.map(fee => ({
          ...fee,
          student_name: fee.niche_training.name,
          student_phone: fee.niche_training.phone,
          course_name: fee.niche_training.course || 'No Course'
        })) || []

        setFees(formattedFees)
      }
    } catch (error) {
      console.error('Error loading fees:', error)
      showToast('Failed to load fees', 'error')
    } finally {
      setLoading(false)
    }
  }



  const filterFees = () => {
    let filtered = [...fees]

    if (searchTerm) {
      filtered = filtered.filter(fee =>
        fee.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fee.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fee.student_phone.includes(searchTerm)
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(fee => fee.payment_status === filterStatus)
    }

    setFilteredFees(filtered)
  }



  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFee) return

    try {
      const amount = parseInt(paymentForm.amount)
      if (amount <= 0 || amount > selectedFee.balance_due) {
        showToast('Invalid payment amount', 'error')
        return
      }

      const { error } = await supabase
        .from('niche_payments')
        .insert({
          fee_id: selectedFee.id,
          amount,
          payment_method: paymentForm.payment_method,
          reference_number: paymentForm.reference_number || null,
          notes: paymentForm.notes || null,
          created_by: staff?.name || user?.email || 'Unknown'
        })

      if (error) throw error

      // Update total_paid in niche_fees
      const { error: updateError } = await supabase
        .from('niche_fees')
        .update({ 
          total_paid: selectedFee.total_paid + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedFee.id)

      if (updateError) throw updateError

      // Log activity
      await ActivityLogger.logCreate(
        user?.id || '',
        'niche_payments',
        '',
        `Payment of KSh ${amount.toLocaleString()} recorded for ${selectedFee.student_name}`,
        staff?.name || user?.email || 'Unknown'
      )

      showToast('Payment recorded successfully', 'success')
      setShowPaymentModal(false)
      setPaymentForm({ amount: '', payment_method: 'Cash', reference_number: '', notes: '' })
      loadFees()
    } catch (error: any) {
      console.error('Error adding payment:', error)
      showToast(`Error: ${error?.message || 'Unknown error'}`, 'error')
    }
  }

  const loadPaymentHistory = async (feeId: string) => {
    try {
      const { data, error } = await supabase
        .from('niche_payments')
        .select('*')
        .eq('fee_id', feeId)
        .order('payment_date', { ascending: false })

      if (error) throw error
      setPayments(data || [])
    } catch (error) {
      console.error('Error loading payment history:', error)
      setPayments([])
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NICHE Fees</h1>
          <p className="text-gray-600">Manage student fees and payments</p>
        </div>
      </div>

      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        statusOptions={statusOptions}
        placeholder="Search by student name, course, or phone..."
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Fee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFees.map((fee, index) => (
                <tr key={fee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{fee.student_name}</div>
                    <div className="text-sm text-gray-500">{fee.student_phone?.replace(/\D/g, '').replace(/^254/, '+254')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{fee.course_name}</span>
                      <button
                        onClick={() => {
                          // Add course functionality here
                          showToast('Add course feature coming soon', 'info')
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Add/Edit Course"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    KSh {fee.course_fee.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    KSh {fee.total_paid.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                    KSh {(fee.course_fee - fee.total_paid).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={fee.payment_status} type="payment" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedFee(fee)
                          loadPaymentHistory(fee.id)
                          setShowPaymentHistory(true)
                        }}
                        className="text-blue-600 hover:text-blue-800 mr-2"
                        title="View Payment History"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        placeholder="Amount"
                        className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
                        onKeyPress={async (e) => {
                          if (e.key === 'Enter') {
                            const amount = parseInt(e.currentTarget.value)
                            if (amount > 0) {
                              try {
                                const { error } = await supabase
                                  .from('niche_payments')
                                  .insert({
                                    fee_id: fee.id,
                                    amount,
                                    payment_method: 'Cash',
                                    created_by: staff?.name || user?.email || 'Unknown'
                                  })
                                if (error) throw error
                                
                                await supabase
                                  .from('niche_fees')
                                  .update({ 
                                    total_paid: fee.total_paid + amount,
                                    updated_at: new Date().toISOString()
                                  })
                                  .eq('id', fee.id)
                                
                                e.currentTarget.value = ''
                                loadFees()
                                showToast(`Payment of KSh ${amount.toLocaleString()} recorded`, 'success')
                              } catch (error: any) {
                                showToast(`Error: ${error?.message}`, 'error')
                              }
                            }
                          }
                        }}
                      />
                      <button
                        onClick={async (e) => {
                          const button = e.currentTarget
                          const input = button.previousElementSibling as HTMLInputElement
                          const amount = parseInt(input.value)
                          if (amount > 0 && !button.disabled) {
                            button.disabled = true
                            try {
                              const { error } = await supabase
                                .from('niche_payments')
                                .insert({
                                  fee_id: fee.id,
                                  amount,
                                  payment_method: 'Cash',
                                  created_by: staff?.name || user?.email || 'Unknown'
                                })
                              if (error) throw error
                              
                              await supabase
                                .from('niche_fees')
                                .update({ 
                                  total_paid: fee.total_paid + amount,
                                  updated_at: new Date().toISOString()
                                })
                                .eq('id', fee.id)
                              
                              input.value = ''
                              loadFees()
                              showToast(`Payment of KSh ${amount.toLocaleString()} recorded`, 'success')
                            } catch (error: any) {
                              showToast(`Error: ${error?.message}`, 'error')
                            } finally {
                              button.disabled = false
                            }
                          }
                        }}
                        className="text-green-600 hover:text-green-800"
                        title="Add Payment"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredFees.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No fee records found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Active students will appear here automatically.'}
            </p>
          </div>
        )}
      </div>



      {/* Add Payment Modal */}
      {showPaymentModal && selectedFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Add Payment for {selectedFee.student_name}
              </h2>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  <div>Course Fee: KSh {selectedFee.course_fee.toLocaleString()}</div>
                  <div>Paid: KSh {selectedFee.total_paid.toLocaleString()}</div>
                  <div className="font-medium">Balance: KSh {selectedFee.balance_due.toLocaleString()}</div>
                </div>
              </div>

              <form onSubmit={handleAddPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedFee.balance_due}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  >
                    <option value="Cash">Cash</option>
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                  <input
                    type="text"
                    value={paymentForm.reference_number}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    placeholder="Transaction ID, receipt number, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false)
                      setPaymentForm({ amount: '', payment_method: 'Cash', reference_number: '', notes: '' })
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showPaymentHistory && selectedFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Payment History - {selectedFee.student_name}
              </h2>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Course Fee:</span>
                    <div>KSh {selectedFee.course_fee.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="font-medium">Total Paid:</span>
                    <div className="text-green-600">KSh {selectedFee.total_paid.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="font-medium">Balance:</span>
                    <div className="text-red-600">KSh {selectedFee.balance_due.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {payments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No payments recorded yet</p>
                ) : (
                  payments.map((payment) => (
                    <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-green-600">
                            KSh {payment.amount.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {(() => {
                              const date = new Date(payment.payment_date)
                              const day = date.getDate()
                              const month = date.toLocaleDateString('en-US', { month: 'long' })
                              const year = date.getFullYear()
                              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
                              const suffix = day === 1 || day === 21 || day === 31 ? 'st' : 
                                           day === 2 || day === 22 ? 'nd' : 
                                           day === 3 || day === 23 ? 'rd' : 'th'
                              return `${dayName}, ${day}${suffix} ${month} ${year}`
                            })()} - KSh {payment.amount.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {payment.reference_number && (
                        <div className="text-sm text-gray-600">
                          Ref: {payment.reference_number}
                        </div>
                      )}
                      {payment.notes && (
                        <div className="text-sm text-gray-600 mt-1">
                          {payment.notes}
                        </div>
                      )}
                      {payment.created_by && (
                        <div className="text-xs text-gray-400 mt-1">
                          Recorded by: {payment.created_by}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowPaymentHistory(false)
                    setSelectedFee(null)
                    setPayments([])
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
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