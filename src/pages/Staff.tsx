import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SearchFilter } from '../components/ui/SearchFilter'
import { Eye, Users } from 'lucide-react'
import { formatDate } from '../utils/dateFormat'

interface StaffMember {
  id: string
  name: string
  phone: string
  role: string
  source: string
  inquiry_date: string
  notes?: string
  created_at: string
}

export function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadStaff()
  }, [])

  useEffect(() => {
    filterStaff()
  }, [staff, searchTerm])

  const loadStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('status', 'WON')
        .order('inquiry_date', { ascending: false })

      if (error) throw error
      setStaff(data || [])
    } catch (error) {
      console.error('Error loading staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterStaff = () => {
    let filtered = [...staff]

    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.phone.includes(searchTerm) ||
        member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.source.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredStaff(filtered)
  }

  const handleViewDetails = (member: StaffMember) => {
    setSelectedStaff(member)
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow h-20"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Members</h1>
        <p className="text-gray-600">Successfully hired candidates</p>
      </div>

      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus="all"
        onFilterChange={() => {}}
        statusOptions={[]}
        placeholder="Search by name, phone, role, or source..."
        hideStatusFilter
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hired Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStaff.map((member, index) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.source}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(member.inquiry_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(member)}
                      className="text-nestalk-primary hover:text-nestalk-primary/80"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStaff.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No staff members found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria.' : 'No candidates have been hired yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Staff Member Details</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStaff.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStaff.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStaff.role}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Source</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStaff.source}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hired Date</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedStaff.inquiry_date)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Added to System</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedStaff.created_at)}</p>
                  </div>
                </div>
                
                {selectedStaff.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedStaff.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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