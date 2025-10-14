import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { UserCheck, Phone, Calendar, MapPin, Eye } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

interface WonCandidate {
  id: string
  name: string
  phone: string
  source?: string
  role: string
  inquiry_date: string
  created_at: string
  id_number?: string
  place_of_stay?: string
  hired_date?: string
}

export function Staff() {
  const [candidates, setCandidates] = useState<WonCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredCandidates, setFilteredCandidates] = useState<WonCandidate[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<WonCandidate | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [candidateNotes, setCandidateNotes] = useState<any[]>([])

  const { showToast } = useToast()

  useEffect(() => {
    loadWonCandidates()
  }, [])

  useEffect(() => {
    filterCandidates()
  }, [candidates, searchTerm])

  const loadWonCandidates = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('status', 'WON')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Get hired dates for each candidate
      const candidatesWithHiredDate = await Promise.all(
        (data || []).map(async (candidate) => {
          const hiredDate = await getHiredDate(candidate.id)
          return { ...candidate, hired_date: hiredDate }
        })
      )
      
      setCandidates(candidatesWithHiredDate)
    } catch (error) {
      console.error('Error loading won candidates:', error)
      showToast('Failed to load staff', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getHiredDate = async (candidateId: string) => {
    try {
      // First check if there's a won interview
      const { data: interviews } = await supabase
        .from('interviews')
        .select('date_time, outcome, updated_at')
        .eq('candidate_id', candidateId)
        .eq('outcome', 'Won Interview')
        .order('updated_at', { ascending: false })
        .limit(1)
      
      if (interviews && interviews.length > 0) {
        return interviews[0].updated_at
      }
      
      // If no won interview, check updates table for when candidate was marked as WON
      const { data: updates } = await supabase
        .from('updates')
        .select('created_at')
        .eq('linked_to_type', 'candidate')
        .eq('linked_to_id', candidateId)
        .ilike('update_text', '%marked as WON%')
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (updates && updates.length > 0) {
        return updates[0].created_at
      }
      
      // Fallback to candidate created_at
      const { data: candidate } = await supabase
        .from('candidates')
        .select('created_at')
        .eq('id', candidateId)
        .single()
      
      return candidate?.created_at || new Date().toISOString()
    } catch (error) {
      console.error('Error getting hired date:', error)
      return new Date().toISOString()
    }
  }

  const filterCandidates = () => {
    let filtered = [...candidates]

    if (searchTerm) {
      filtered = filtered.filter(candidate =>
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.phone.includes(searchTerm) ||
        candidate.role.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredCandidates(filtered)
  }

  const handleViewDetails = async (candidate: WonCandidate) => {
    setSelectedCandidate(candidate)
    setShowDetailModal(true)
    
    // Load notes
    try {
      const { data, error } = await supabase
        .from('candidate_notes')
        .select('*, users(name)')
        .eq('candidate_id', candidate.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setCandidateNotes(data || [])
    } catch (error) {
      console.error('Error loading notes:', error)
      setCandidateNotes([])
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white p-6 rounded-lg shadow h-96"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Directory</h1>
        <p className="text-gray-600">All successfully hired candidates</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, phone, or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
        />
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="text-center py-12">
          <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No staff found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search criteria.' : 'No candidates have been marked as won yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                {filteredCandidates.map((candidate, index) => (
                  <tr key={candidate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Phone className="w-3 h-3 mr-1" />
                        {candidate.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.source || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDisplayDate(candidate.hired_date || candidate.created_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(candidate)}
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
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Staff Details - {selectedCandidate.name}
              </h2>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="text-sm text-gray-900">{selectedCandidate.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm text-gray-900 flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    {selectedCandidate.phone}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <p className="text-sm text-gray-900">{selectedCandidate.role}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Source</label>
                  <p className="text-sm text-gray-900">{selectedCandidate.source || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Inquiry Date</label>
                  <p className="text-sm text-gray-900 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    {formatDisplayDate(selectedCandidate.inquiry_date)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hired Date</label>
                  <p className="text-sm text-gray-900 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    {formatDisplayDate(selectedCandidate.hired_date || selectedCandidate.created_at)}
                  </p>
                </div>
                {selectedCandidate.id_number && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ID Number</label>
                    <p className="text-sm text-gray-900">{selectedCandidate.id_number}</p>
                  </div>
                )}
                {selectedCandidate.place_of_stay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Place of Stay</label>
                    <p className="text-sm text-gray-900 flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      {selectedCandidate.place_of_stay}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="mb-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Notes</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {candidateNotes.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No notes available</p>
                  ) : (
                    candidateNotes.map((note) => (
                      <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-900 text-sm">{note.users?.name || 'Unknown'}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(note.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{note.note}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedCandidate(null)
                    setCandidateNotes([])
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