import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SearchFilter } from '../components/ui/SearchFilter'
import { StatusBadge } from '../components/ui/StatusBadge'
import { CommunicationsModal } from '../components/ui/CommunicationsModal'
import { Plus, GraduationCap, Phone, Calendar, MessageSquare, Eye, Edit } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ActivityLogger } from '../lib/activityLogger'

interface TrainingLead {
  id: string
  name: string
  phone: string
  training_type: string
  inquiry_date: string
  status: string
  reminder_date: string | null
  assigned_to: string | null
  notes: string
  created_at: string
}

export function TrainingLeads() {
  const [trainingLeads, setTrainingLeads] = useState<TrainingLead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<TrainingLead[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCommsModal, setShowCommsModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<TrainingLead | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    training_type: '',
    status: 'pending',
    reminder_date: '',
    notes: '',
  })

  const { user, staff } = useAuth()

  const statusOptions = ['pending', 'contacted', 'interested', 'enrolled', 'completed', 'dropped-off']
  const trainingTypes = ['Web Development', 'Data Science', 'Digital Marketing', 'UI/UX Design', 'Project Management', 'Cybersecurity', 'Other']

  useEffect(() => {
    loadTrainingLeads()
  }, [])

  useEffect(() => {
    filterLeads()
  }, [trainingLeads, searchTerm, filterStatus])

  const loadTrainingLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('training_leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTrainingLeads(data || [])
    } catch (error) {
      console.error('Error loading training leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterLeads = () => {
    let filtered = trainingLeads

    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm) ||
        lead.training_type.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(lead => lead.status === filterStatus)
    }

    setFilteredLeads(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (selectedLead) {
        // Update existing lead
        const { error } = await supabase
          .from('training_leads')
          .update({
            ...formData,
            reminder_date: formData.reminder_date || null,
          })
          .eq('id', selectedLead.id)

        if (error) throw error

        // Log the activity for training lead edit
        if (staff?.id && staff?.name) {
          await ActivityLogger.logEdit(
            staff.id,
            'training_lead',
            selectedLead.id,
            formData.name,
            staff.name
          )
        }

        // Add update log
        await supabase.from('updates').insert({
          linked_to_type: 'training_lead',
          linked_to_id: selectedLead.id,
          user_id: user?.id,
          update_text: `Updated training lead status to ${formData.status}`,
          reminder_date: formData.reminder_date || null,
        })
      } else {
        // Create new lead
        const { error } = await supabase
          .from('training_leads')
          .insert({
            ...formData,
            assigned_to: user?.id,
            reminder_date: formData.reminder_date || null,
          })

        if (error) throw error
        
        // Log the activity for training lead creation
        if (staff?.id && staff?.name) {
          await ActivityLogger.logCreate(
            staff.id,
            'training_lead',
            'new', // We don't have the ID yet
            formData.name,
            staff.name
          )
        }
      }

      await loadTrainingLeads()
      setShowModal(false)
      resetForm()
    } catch (error) {
      console.error('Error saving training lead:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      training_type: '',
      status: 'pending',
      reminder_date: '',
      notes: '',
    })
    setSelectedLead(null)
  }

  const handleEdit = (lead: TrainingLead) => {
    setSelectedLead(lead)
    setFormData({
      name: lead.name,
      phone: lead.phone,
      training_type: lead.training_type,
      status: lead.status,
      reminder_date: lead.reminder_date || '',
      notes: lead.notes,
    })
    setShowModal(true)
  }

  const handleViewComms = (lead: TrainingLead) => {
    setSelectedLead(lead)
    setShowCommsModal(true)
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
          <h1 className="text-2xl font-bold text-gray-900">Training Leads</h1>
          <p className="text-gray-600">Track training program inquiries and enrollment</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Training Lead
        </button>
      </div>

      {/* Search and Filter */}
      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        statusOptions={statusOptions}
        placeholder="Search by name, phone, or training type..."
      />

      {/* Training Leads Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Training Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inquiry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.map((lead, index) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center">
                      <Phone className="w-3 h-3 mr-1" />
                      {lead.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lead.training_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={lead.status} type="training" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(lead.inquiry_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(lead)}
                      className="text-nestalk-primary hover:text-nestalk-primary/80 inline-flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleViewComms(lead)}
                      className="text-blue-600 hover:text-blue-800 inline-flex items-center ml-2"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Comms
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Old grid layout commented out for reference
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLeads.map((lead) => (
          <div key={lead.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{lead.name}</h3>
                <div className="flex items-center text-gray-600 mt-1">
                  <Phone className="w-4 h-4 mr-1" />
                  <span className="text-sm">{lead.phone}</span>
                </div>
              </div>
              <StatusBadge status={lead.status} type="training" />
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <GraduationCap className="w-4 h-4 mr-2" />
                <span>Training: {lead.training_type}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                <span>Inquiry: {new Date(lead.inquiry_date).toLocaleDateString()}</span>
              </div>
              {lead.reminder_date && (
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Reminder: {new Date(lead.reminder_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {lead.notes && (
              <div className="mb-4">
                <div className="flex items-start text-sm text-gray-600">
                  <MessageSquare className="w-4 h-4 mr-2 mt-0.5" />
                  <span className="line-clamp-2">{lead.notes}</span>
                </div>
              </div>
            )}

            <button
              onClick={() => handleEdit(lead)}
              className="w-full px-4 py-2 text-sm font-medium text-nestalk-primary bg-nestalk-primary/10 rounded-lg hover:bg-nestalk-primary/20 transition-colors"
            >
              Edit Details
            </button>
          </div>
        ))}
      </div> */}

      {filteredLeads.length === 0 && (
        <div className="text-center py-12">
          <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No training leads found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding your first training inquiry.'
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
                {selectedLead ? 'Edit Training Lead' : 'Add New Training Lead'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Training Type</label>
                  <select
                    required
                    value={formData.training_type}
                    onChange={(e) => setFormData({ ...formData, training_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  >
                    <option value="">Select training type</option>
                    {trainingTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>
                        {status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Date</label>
                  <input
                    type="date"
                    value={formData.reminder_date}
                    onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    placeholder="Add any notes about this training inquiry..."
                  />
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
                    {selectedLead ? 'Update' : 'Add'} Training Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Communications Modal */}
      <CommunicationsModal
        isOpen={showCommsModal}
        onClose={() => setShowCommsModal(false)}
        linkedToType="training_lead"
        linkedToId={selectedLead?.id || ''}
        linkedToName={selectedLead?.name || ''}
      />
    </div>
  )
}