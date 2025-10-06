import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Users, Phone, Calendar, MapPin, CreditCard, Eye, Plus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

interface BlacklistedCandidate {
  id: string
  name: string
  phone: string
  source?: string
  role: string
  inquiry_date: string
  created_at: string
  id_number?: string
  place_of_stay?: string
  blacklist_reason?: string
}

export function Blacklisted() {
  const [candidates, setCandidates] = useState<BlacklistedCandidate[]>([])
  const [filteredCandidates, setFilteredCandidates] = useState<BlacklistedCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedCandidate, setSelectedCandidate] = useState<BlacklistedCandidate | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [candidateNotes, setCandidateNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [editingDetails, setEditingDetails] = useState(false)
  const [detailsForm, setDetailsForm] = useState({
    id_number: '',
    place_of_stay: '',
    blacklist_reason: ''
  })

  const { user } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    loadBlacklistedCandidates()
  }, [])

  useEffect(() => {
    filterCandidates()
  }, [candidates, searchTerm, roleFilter])

  const loadBlacklistedCandidates = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('status', 'BLACKLISTED')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCandidates(data || [])
      setFilteredCandidates(data || [])
    } catch (error) {
      console.error('Error loading blacklisted candidates:', error)
      showToast('Failed to load blacklisted candidates', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = async (candidate: BlacklistedCandidate) => {
    setSelectedCandidate(candidate)
    setDetailsForm({
      id_number: candidate.id_number || '',
      place_of_stay: candidate.place_of_stay || '',
      blacklist_reason: candidate.blacklist_reason || ''
    })
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

  const handleSaveDetails = async () => {
    if (!selectedCandidate) return
    
    try {
      const { error } = await supabase
        .from('candidates')
        .update({
          id_number: detailsForm.id_number,
          place_of_stay: detailsForm.place_of_stay,
          blacklist_reason: detailsForm.blacklist_reason
        })
        .eq('id', selectedCandidate.id)
      
      if (error) throw error
      
      setCandidates(prev => prev.map(c => 
        c.id === selectedCandidate.id 
          ? { ...c, ...detailsForm }
          : c
      ))
      
      setSelectedCandidate(prev => prev ? { ...prev, ...detailsForm } : null)
      setEditingDetails(false)
      showToast('Details updated successfully', 'success')
    } catch (error) {
      console.error('Error updating details:', error)
      showToast('Failed to update details', 'error')
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedCandidate) return
    
    try {
      const { error } = await supabase
        .from('candidate_notes')
        .insert({
          candidate_id: selectedCandidate.id,
          user_id: user?.id,
          note: newNote.trim(),
          created_at: new Date().toISOString()
        })
      
      if (error) throw error
      
      setNewNote('')
      await handleViewDetails(selectedCandidate)
      showToast('Note added successfully', 'success')
    } catch (error) {
      console.error('Error adding note:', error)
      showToast('Failed to add note', 'error')
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

  const filterCandidates = () => {
    let filtered = [...candidates]

    if (searchTerm) {
      filtered = filtered.filter(candidate =>
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.phone.includes(searchTerm) ||
        (candidate.blacklist_reason && candidate.blacklist_reason.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(candidate => candidate.role === roleFilter)
    }

    setFilteredCandidates(filtered)
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
        <p className="text-gray-600">Manage blacklisted candidates with detailed information</p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, phone, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
          />
        </div>
        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="Nanny">Nanny</option>
            <option value="House Manager">House Manager</option>
            <option value="Chef">Chef</option>
            <option value="Driver">Driver</option>
            <option value="Night Nurse">Night Nurse</option>
            <option value="Caregiver">Caregiver</option>
            <option value="Housekeeper">Housekeeper</option>
          </select>
        </div>
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No blacklisted candidates</h3>
          <p className="mt-1 text-sm text-gray-500">
            Candidates marked as blacklisted will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((candidate) => (
            <div
              key={candidate.id}
              className="bg-white rounded-lg shadow-sm border border-red-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewDetails(candidate)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{candidate.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center">
                    <Phone className="w-3 h-3 mr-1" />
                    {candidate.phone}
                  </p>
                </div>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                  BLACKLISTED
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-medium">{candidate.role}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Source:</span>
                  <span className="font-medium">{candidate.source || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Blacklisted:</span>
                  <span className="font-medium">{formatDisplayDate(candidate.created_at)}</span>
                </div>
              </div>
              
              {candidate.blacklist_reason && (
                <div className="mb-4">
                  <p className="text-xs text-gray-600 mb-1">Reason:</p>
                  <p className="text-sm text-red-700 bg-red-50 p-2 rounded line-clamp-2">
                    {candidate.blacklist_reason}
                  </p>
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-200">
                <button className="w-full text-center text-red-600 hover:text-red-800 font-medium text-sm flex items-center justify-center">
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Blacklisted Candidate Details - {selectedCandidate.name}
              </h2>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="text-sm text-gray-900">{selectedCandidate.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-sm text-gray-900">{selectedCandidate.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <p className="text-sm text-gray-900">{selectedCandidate.role}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Source</label>
                    <p className="text-sm text-gray-900">{selectedCandidate.source || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Inquiry Date</label>
                    <p className="text-sm text-gray-900">{formatDisplayDate(selectedCandidate.inquiry_date)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Blacklisted Date</label>
                    <p className="text-sm text-gray-900">{formatDisplayDate(selectedCandidate.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-semibold text-gray-900">Additional Details</h3>
                  <button
                    onClick={() => setEditingDetails(!editingDetails)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {editingDetails ? 'Cancel' : 'Edit'}
                  </button>
                </div>
                
                {editingDetails ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                      <input
                        type="text"
                        value={detailsForm.id_number}
                        onChange={(e) => setDetailsForm(prev => ({ ...prev, id_number: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        placeholder="Enter ID number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Place of Stay</label>
                      <input
                        type="text"
                        value={detailsForm.place_of_stay}
                        onChange={(e) => setDetailsForm(prev => ({ ...prev, place_of_stay: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        placeholder="Enter place of stay"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Blacklist Reason</label>
                      <textarea
                        value={detailsForm.blacklist_reason}
                        onChange={(e) => setDetailsForm(prev => ({ ...prev, blacklist_reason: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        placeholder="Enter reason for blacklisting"
                      />
                    </div>
                    <button
                      onClick={handleSaveDetails}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Save Details
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ID Number</label>
                      <p className="text-sm text-gray-900 flex items-center">
                        <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
                        {selectedCandidate.id_number || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Place of Stay</label>
                      <p className="text-sm text-gray-900 flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        {selectedCandidate.place_of_stay || 'Not provided'}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Blacklist Reason</label>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">
                          {selectedCandidate.blacklist_reason || 'No reason provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes Section */}
              <div className="mb-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Notes</h3>
                
                {/* Add Note */}
                <div className="mb-4">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleAddNote}
                      disabled={!newNote.trim()}
                      className="px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 disabled:opacity-50"
                    >
                      Add Note
                    </button>
                  </div>
                </div>
                
                {/* Notes List */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {candidateNotes.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No notes yet</p>
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

              {/* Actions */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedCandidate(null)
                    setCandidateNotes([])
                    setNewNote('')
                    setEditingDetails(false)
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