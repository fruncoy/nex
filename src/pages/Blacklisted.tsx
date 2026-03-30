import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SearchFilter } from '../components/ui/SearchFilter'
import { Edit, UserX, Phone } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { ActivityLogger } from '../lib/activityLogger'

interface BlacklistedCandidate {
  id: string
  name: string
  phone: string
  role: string
  notes?: string
  created_at: string
  updated_at: string
}

export function Blacklisted() {
  const [blacklisted, setBlacklisted] = useState<BlacklistedCandidate[]>([])
  const [filteredBlacklisted, setFilteredBlacklisted] = useState<BlacklistedCandidate[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selectedCandidate, setSelectedCandidate] = useState<BlacklistedCandidate | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    notes: ''
  })

  const { user, staff } = useAuth()
  const { showToast } = useToast()

  const roles = ['all', 'Housekeeper', 'Nanny', 'Cook', 'Driver', 'Gardener', 'Security', 'Other']

  useEffect(() => {
    loadBlacklisted()
  }, [])

  useEffect(() => {
    filterBlacklisted()
  }, [blacklisted, searchTerm, filterRole])

  const loadBlacklisted = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('status', 'BLACKLISTED')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setBlacklisted(data || [])
    } catch (error) {
      console.error('Error loading blacklisted candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterBlacklisted = () => {
    let filtered = [...blacklisted]

    if (searchTerm) {
      filtered = filtered.filter(candidate =>
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.phone.includes(searchTerm) ||
        candidate.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterRole !== 'all') {
      filtered = filtered.filter(candidate => candidate.role === filterRole)
    }

    setFilteredBlacklisted(filtered)
  }

  const handleEdit = (candidate: BlacklistedCandidate) => {
    setSelectedCandidate(candidate)
    setFormData({
      notes: candidate.notes || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedCandidate) return

    try {
      const { error } = await supabase
        .from('candidates')
        .update({
          notes: formData.notes.trim() || null,
          updated_by: staff?.name || user?.email || 'Unknown'
        })
        .eq('id', selectedCandidate.id)

      if (error) throw error

      await ActivityLogger.logEdit(
        user?.id || '',
        'candidates',
        selectedCandidate.id,
        selectedCandidate.name,
        staff?.name || user?.email || 'Unknown'
      )

      showToast('Blacklisted candidate updated successfully', 'success')
      setShowModal(false)
      loadBlacklisted()
    } catch (error: any) {
      console.error('Error updating candidate:', error)
      showToast(`Error: ${error?.message || 'Unknown error'}`, 'error')
    }
  }

  const getBlacklistReason = (notes: string | undefined) => {
    if (!notes) return 'No reason provided'
    const lines = notes.split('\n')
    return lines[0].length > 50 ? lines[0].substring(0, 50) + '...' : lines[0]
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow h-48"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Blacklisted Candidates</h1>
        <p className="text-gray-600">Candidates marked as blacklisted</p>
      </div>

      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterRole}
        onFilterChange={setFilterRole}
        statusOptions={roles}
        placeholder="Search by name, phone, or reason..."
        statusLabel="Role"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBlacklisted.map((candidate) => (
          <div key={candidate.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{candidate.name}</h3>
                <div className="flex items-center text-gray-600 mt-1">
                  <Phone className="w-4 h-4 mr-1" />
                  <span className="text-sm">{candidate.phone}</span>
                </div>
              </div>
              <button
                onClick={() => handleEdit(candidate)}
                className="text-gray-400 hover:text-nestalk-primary transition-colors"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-700">Role:</span>
                <span className="text-sm text-gray-900 ml-2">{candidate.role}</span>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-700">Reason:</span>
                <p className="text-sm text-gray-900 mt-1">{getBlacklistReason(candidate.notes)}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <span className="text-xs text-gray-500">
                Blacklisted: {new Date(candidate.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredBlacklisted.length === 0 && (
        <div className="text-center py-12">
          <UserX className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No blacklisted candidates found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterRole !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'No candidates have been blacklisted yet.'}
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {showModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Edit Blacklisted Candidate
              </h2>
              
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900">{selectedCandidate.name}</h3>
                <p className="text-sm text-gray-600">{selectedCandidate.phone} • {selectedCandidate.role}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Blacklist Reason & Additional Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    placeholder="Enter the reason for blacklisting and any additional notes..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors"
                  >
                    Update
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