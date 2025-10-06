import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle, XCircle, Plus, User, DollarSign, Calendar, Search, Filter, Grid3X3, List } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

interface ConvertedClient {
  id: string
  name: string
  phone: string
  gmail: string
  want_to_hire: string
  placement_fee: number | null
  placement_status: string
}

interface Placement {
  id: string
  client_id: string
  candidate_id: string
  candidate_name: string
  placement_order: number
  outcome: string
  start_date: string
  end_date: string | null
  notes: string
}

export function ConvertedClients() {
  const [clients, setClients] = useState<ConvertedClient[]>([])
  const [placements, setPlacements] = useState<Placement[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<ConvertedClient | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [placementFee, setPlacementFee] = useState('')
  const [placementStatus, setPlacementStatus] = useState('Active')
  const [showAddReplacement, setShowAddReplacement] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState('')
  const [replacementNotes, setReplacementNotes] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const { showToast } = useToast()

  const placementStatuses = ['Active', 'Refunded', 'Lost (Refunded)', 'Lost (No Refund)']
  const outcomes = ['Successful', 'Failed']

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [clientsRes, placementsRes, candidatesRes] = await Promise.all([
        supabase.from('clients').select('*').eq('status', 'Won'),
        supabase.from('client_placements').select('*, candidates(name)').order('placement_order'),
supabase.from('candidates').select('id, name').eq('status', 'WON')
      ])

      setClients(clientsRes.data || [])
      setPlacements(placementsRes.data || [])
      setCandidates(candidatesRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (client: ConvertedClient) => {
    setSelectedClient(client)
    setPlacementFee(client.placement_fee?.toString() || '')
    setPlacementStatus(client.placement_status || 'Active')
    setShowDetailModal(true)
  }

  const handleSavePlacement = async () => {
    if (!selectedClient) return

    try {
      const oldFee = selectedClient.placement_fee
      const oldStatus = selectedClient.placement_status
      const newFee = parseFloat(placementFee) || null
      const newStatus = placementStatus

      const { error } = await supabase
        .from('clients')
        .update({
          placement_fee: newFee,
          placement_status: newStatus
        })
        .eq('id', selectedClient.id)

      if (error) throw error

      // Log changes
      const logs = []
      if (oldFee !== newFee) {
        logs.push({
          linked_to_type: 'client',
          linked_to_id: selectedClient.id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          update_text: `Placement fee updated from $${oldFee || 0} to $${newFee || 0}`,
          created_at: new Date().toISOString()
        })
      }
      if (oldStatus !== newStatus) {
        logs.push({
          linked_to_type: 'client',
          linked_to_id: selectedClient.id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          update_text: `Placement status changed from ${oldStatus || 'Active'} to ${newStatus}`,
          created_at: new Date().toISOString()
        })
      }

      if (logs.length > 0) {
        await supabase.from('updates').insert(logs)
      }

      await loadData()
      showToast('Placement details saved', 'success')
    } catch (error) {
      console.error('Error saving placement:', error)
      showToast('Failed to save placement details', 'error')
    }
  }

  const handleAddReplacement = async () => {
    if (!selectedClient || !selectedCandidate) return

    const clientPlacements = placements.filter(p => p.client_id === selectedClient.id)
    if (clientPlacements.length >= 3) {
      showToast('Maximum 3 replacements allowed', 'error')
      return
    }

    try {
      const candidateName = candidates.find(c => c.id === selectedCandidate)?.name
      
      const { error } = await supabase
        .from('client_placements')
        .insert({
          client_id: selectedClient.id,
          candidate_id: selectedCandidate,
          placement_order: clientPlacements.length + 1,
          outcome: 'Active',
          start_date: new Date().toISOString().split('T')[0],
          notes: replacementNotes
        })

      if (error) throw error

      // Log replacement addition
      await supabase.from('updates').insert({
        linked_to_type: 'client',
        linked_to_id: selectedClient.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        update_text: `Added replacement candidate: ${candidateName}. Reason: ${replacementNotes || 'No reason provided'}`,
        created_at: new Date().toISOString()
      })

      await loadData()
      setShowAddReplacement(false)
      setSelectedCandidate('')
      setReplacementNotes('')
      showToast('Replacement added', 'success')
    } catch (error) {
      console.error('Error adding replacement:', error)
      showToast('Failed to add replacement', 'error')
    }
  }

  const updatePlacementOutcome = async (placementId: string, outcome: string) => {
    try {
      const placement = placements.find(p => p.id === placementId)
      if (!placement) return

      const { error } = await supabase
        .from('client_placements')
        .update({
          outcome,
          end_date: outcome === 'Failed' ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', placementId)

      if (error) throw error

      // Log outcome change
      await supabase.from('updates').insert({
        linked_to_type: 'client',
        linked_to_id: placement.client_id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        update_text: `Placement outcome for ${placement.candidate_name} marked as ${outcome}`,
        created_at: new Date().toISOString()
      })

      await loadData()
      showToast('Placement outcome updated', 'success')
    } catch (error) {
      console.error('Error updating outcome:', error)
      showToast('Failed to update outcome', 'error')
    }
  }

  const getClientPlacements = (clientId: string) => {
    return placements.filter(p => p.client_id === clientId).sort((a, b) => a.placement_order - b.placement_order)
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.phone.includes(searchTerm) ||
                         client.want_to_hire.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || client.placement_status === statusFilter
    return matchesSearch && matchesStatus
  })

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Converted Clients</h1>
        <p className="text-gray-600">Manage placements and replacements for won clients</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
          >
            <option value="All">All Status</option>
            {placementStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 ${viewMode === 'card' ? 'bg-nestalk-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 ${viewMode === 'table' ? 'bg-nestalk-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'card' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredClients.map((client) => {
            const clientPlacements = getClientPlacements(client.id)
            const statusColors = {
              'Active': 'bg-emerald-100 text-emerald-800 border-emerald-200',
              'Refunded': 'bg-amber-100 text-amber-800 border-amber-200',
              'Lost (Refunded)': 'bg-rose-100 text-rose-800 border-rose-200',
              'Lost (No Refund)': 'bg-red-100 text-red-800 border-red-200'
            }
            return (
              <div key={client.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => handleViewDetails(client)}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-nestalk-primary transition-colors">{client.name}</h3>
                    <p className="text-xs text-gray-500 truncate">{client.phone}</p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                    statusColors[client.placement_status as keyof typeof statusColors] || statusColors['Active']
                  }`}>
                    {client.placement_status || 'Active'}
                  </span>
                </div>
                
                <div className="mb-3">
                  <p className="text-xs text-gray-600 line-clamp-2">{client.want_to_hire}</p>
                </div>
                
                <div className="pt-3 border-t border-gray-100">
                  <button className="w-full text-center text-nestalk-primary hover:text-nestalk-primary/80 font-medium text-xs group-hover:bg-nestalk-primary/5 py-1 rounded transition-colors">
                    Manage Placement
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placements</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => {
                  const clientPlacements = getClientPlacements(client.id)
                  return (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{client.name}</div>
                          <div className="text-sm text-gray-500">{client.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.want_to_hire}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          client.placement_status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                          client.placement_status === 'Refunded' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {client.placement_status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.placement_fee ? `$${client.placement_fee.toLocaleString()}` : 'Not set'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {clientPlacements.length} placement{clientPlacements.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(client)}
                          className="text-nestalk-primary hover:text-nestalk-primary/80"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Placement Details - {selectedClient.name}
              </h2>

              {/* Placement Fee & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Placement Fee</label>
                  <input
                    type="number"
                    value={placementFee}
                    onChange={(e) => setPlacementFee(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Placement Status</label>
                  <select
                    value={placementStatus}
                    onChange={(e) => setPlacementStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  >
                    {placementStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Timeline */}
              <div className="mb-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Placement Timeline</h3>
                <div className="space-y-4">
                  {getClientPlacements(selectedClient.id).map((placement, index) => (
                    <div key={placement.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          placement.outcome === 'Successful' ? 'bg-green-500' : 
                          placement.outcome === 'Failed' ? 'bg-red-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{placement.candidate_name}</div>
                        <div className="text-sm text-gray-500">Started: {new Date(placement.start_date).toLocaleDateString()}</div>
                        {placement.end_date && (
                          <div className="text-sm text-gray-500">Ended: {new Date(placement.end_date).toLocaleDateString()}</div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updatePlacementOutcome(placement.id, 'Successful')}
                          className={`p-2 rounded ${placement.outcome === 'Successful' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}
                          title="Mark as Successful"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updatePlacementOutcome(placement.id, 'Failed')}
                          className={`p-2 rounded ${placement.outcome === 'Failed' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'}`}
                          title="Mark as Failed"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Replacement */}
                {getClientPlacements(selectedClient.id).length < 3 && (
                  <div className="mt-4">
                    {!showAddReplacement ? (
                      <button
                        onClick={() => setShowAddReplacement(true)}
                        className="flex items-center px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Replacement
                      </button>
                    ) : (
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Candidate</label>
                            <select
                              value={selectedCandidate}
                              onChange={(e) => setSelectedCandidate(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                            >
                              <option value="">Choose candidate...</option>
                              {candidates.map(candidate => (
                                <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                              value={replacementNotes}
                              onChange={(e) => setReplacementNotes(e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                              placeholder="Reason for replacement..."
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={handleAddReplacement}
                              disabled={!selectedCandidate}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => {
                                setShowAddReplacement(false)
                                setSelectedCandidate('')
                                setReplacementNotes('')
                              }}
                              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-4">
                <button
                  onClick={handleSavePlacement}
                  className="px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90"
                >
                  Save Details
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedClient(null)
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