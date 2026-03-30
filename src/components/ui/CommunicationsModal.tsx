import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { X, MessageSquare, User, Calendar, Plus } from 'lucide-react'

interface Communication {
  id: string
  user_id: string
  description: string
  follow_up_assigned_to: string | null
  created_at: string
  staff?: {
    name: string
    username: string
  }
  assigned_staff?: {
    name: string
    username: string
  }
}

interface CommunicationsModalProps {
  isOpen: boolean
  onClose: () => void
  linkedToType: 'candidate' | 'client' | 'training_lead'
  linkedToId: string
  linkedToName: string
  candidateData?: any
}

export function CommunicationsModal({
  isOpen,
  onClose,
  linkedToType,
  linkedToId,
  linkedToName,
  candidateData
}: CommunicationsModalProps) {
  const [communications, setCommunications] = useState<Communication[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    description: '',
    follow_up_assigned_to: ''
  })

  const { user, staff } = useAuth()

  useEffect(() => {
    if (isOpen) {
      loadCommunications()
      loadStaff()
    }
  }, [isOpen, linkedToId])

  const loadCommunications = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('communications')
        .select(`
          *,
          staff:user_id (name, username),
          assigned_staff:follow_up_assigned_to (name, username)
        `)
        .eq('linked_to_type', linkedToType)
        .eq('linked_to_id', linkedToId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCommunications(data || [])
    } catch (error) {
      console.error('Error loading communications:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, username')
        .order('name')

      if (error) throw error
      setStaffList(data || [])
    } catch (error) {
      console.error('Error loading staff:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { error } = await supabase
        .from('communications')
        .insert({
          linked_to_type: linkedToType,
          linked_to_id: linkedToId,
          user_id: user?.id,
          description: formData.description,
          follow_up_assigned_to: formData.follow_up_assigned_to || null
        })

      if (error) throw error

      // Add to updates feed if follow-up is assigned
      if (formData.follow_up_assigned_to) {
        await supabase.from('updates').insert({
          linked_to_type: linkedToType,
          linked_to_id: linkedToId,
          user_id: user?.id,
          update_text: `Follow-up assigned for ${linkedToName}: ${formData.description}`
        })
      }

      // Also add a general update for the communication
      await supabase.from('updates').insert({
        linked_to_type: linkedToType,
        linked_to_id: linkedToId,
        user_id: user?.id,
        update_text: `Communication added for ${linkedToName}: ${formData.description}`
      })

      setFormData({ description: '', follow_up_assigned_to: '' })
      setShowAddForm(false)
      loadCommunications()
    } catch (error) {
      console.error('Error saving communication:', error)
      alert('Error saving communication. Please try again.')
    }
  }

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleString('default', { month: 'long' })
    const year = date.getFullYear()
    
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                   day === 2 || day === 22 ? 'nd' :
                   day === 3 || day === 23 ? 'rd' : 'th'
    
    return `${day}${suffix} ${month} ${year}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Communications & Notes - {linkedToName}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Candidate Info Section */}
        {candidateData && (
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Phone:</span>
                <div className="text-gray-900">{candidateData.phone}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Source:</span>
                <div className="text-gray-900">{candidateData.source}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Inquiry Date:</span>
                <div className="text-gray-900">{formatDisplayDate(candidateData.inquiry_date)}</div>
              </div>
              {candidateData.scheduled_date && (
                <div>
                  <span className="font-medium text-gray-700">Scheduled Date:</span>
                  <div className="text-gray-900">{formatDisplayDate(candidateData.scheduled_date)}</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nestalk-primary mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {communications.map((comm) => (
                <div key={comm.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {comm.staff?.name} ({comm.staff?.username})
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDisplayDate(comm.created_at)} at{' '}
                      {new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <p className="text-gray-700 mb-2">{comm.description}</p>
                  {comm.follow_up_assigned_to && (
                    <div className="flex items-center text-sm text-blue-600">
                      <User className="w-3 h-3 mr-1" />
                      Follow-up assigned to: {comm.assigned_staff?.name} ({comm.assigned_staff?.username})
                    </div>
                  )}
                </div>
              ))}

              {communications.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No communications recorded yet
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          {showAddForm ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Communication/Note Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  placeholder="Describe the communication or add notes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign Follow-up To (Optional)
                </label>
                <select
                  value={formData.follow_up_assigned_to}
                  onChange={(e) => setFormData({ ...formData, follow_up_assigned_to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                >
                  <option value="">No follow-up assignment</option>
                  {staffList.map(staffMember => (
                    <option key={staffMember.id} value={staffMember.id}>
                      {staffMember.name} ({staffMember.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setFormData({ description: '', follow_up_assigned_to: '' })
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors"
                >
                  Add Communication
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Communication/Note
            </button>
          )}
        </div>
      </div>
    </div>
  )
}