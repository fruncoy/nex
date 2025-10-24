import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle, XCircle, Plus, User, DollarSign, Calendar, Search, Filter, Grid3X3, List, Clock, AlertTriangle, Eye, Edit } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { formatDateTime } from '../utils/dateFormat'
import { ActivityLogger } from '../lib/activityLogger'

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
  placement_date: string
  salary_amount: number | null
  status: string
  original_placement_id: string | null
  replacement_number: number
  notes: string
  candidate_name?: string
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
  const [showAddPlacement, setShowAddPlacement] = useState(false)
  const [showAddReplacement, setShowAddReplacement] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState('')
  const [placementNotes, setPlacementNotes] = useState('')
  const [salaryAmount, setSalaryAmount] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showEditPlacement, setShowEditPlacement] = useState(false)
  const [editingPlacement, setEditingPlacement] = useState<Placement | null>(null)

  const { showToast } = useToast()
  const { staff } = useAuth()

  const placementStatuses = ['Active', 'Lost (Refunded)', 'Lost (No Refund)']
  const placementStatusOptions = ['ACTIVE', 'SUCCESS', 'LOST']

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [clientsRes, placementsRes, candidatesRes] = await Promise.all([
        supabase.from('clients').select('*').eq('status', 'Won'),
        supabase.from('placements').select('*, candidates(name)').order('replacement_number'),
        supabase.from('candidates').select('id, name').eq('status', 'WON')
      ])

      setClients(clientsRes.data || [])
      const placementsWithNames = (placementsRes.data || []).map(p => ({
        ...p,
        candidate_name: p.candidates?.name || 'Unknown'
      }))
      setPlacements(placementsWithNames)
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

  const handleSavePlacement = async (newFee?: number, newStatus?: string) => {
    if (!selectedClient) return

    try {
      const oldFee = selectedClient.placement_fee
      const oldStatus = selectedClient.placement_status
      const fee = newFee !== undefined ? newFee : (parseFloat(placementFee) || null)
      const status = newStatus || placementStatus

      const { error } = await supabase
        .from('clients')
        .update({
          placement_fee: fee,
          placement_status: status,
          updated_by: staff?.id
        })
        .eq('id', selectedClient.id)

      if (error) throw error

      // Log changes
      if (oldFee !== fee) {
        await ActivityLogger.log({
          userId: staff?.id || '',
          actionType: 'edit',
          entityType: 'client',
          entityId: selectedClient.id,
          entityName: selectedClient.name,
          oldValue: oldFee?.toString() || '0',
          newValue: fee?.toString() || '0',
          description: `Placement fee updated from $${oldFee || 0} to $${fee || 0}`
        })
      }
      if (oldStatus !== status) {
        await ActivityLogger.log({
          userId: staff?.id || '',
          actionType: 'status_change',
          entityType: 'client',
          entityId: selectedClient.id,
          entityName: selectedClient.name,
          oldValue: oldStatus || 'Active',
          newValue: status,
          description: `Placement status changed from ${oldStatus || 'Active'} to ${status}`
        })
      }

      await loadData()
    } catch (error) {
      console.error('Error saving placement:', error)
      showToast('Failed to save placement details', 'error')
    }
  }

  const handleAddPlacement = async () => {
    if (!selectedClient || !selectedCandidate) return

    try {
      const candidateName = candidates.find(c => c.id === selectedCandidate)?.name
      
      const { data: placementData, error } = await supabase
        .from('placements')
        .insert({
          client_id: selectedClient.id,
          candidate_id: selectedCandidate,
          placement_date: new Date().toISOString().split('T')[0],
          salary_amount: parseFloat(salaryAmount) || null,
          status: 'ACTIVE',
          replacement_number: 0,
          notes: placementNotes,
          created_by: staff?.id
        })
        .select()
        .single()

      if (error) throw error

      // Log placement addition
      await ActivityLogger.log({
        userId: staff?.id || '',
        actionType: 'create',
        entityType: 'client',
        entityId: selectedClient.id,
        entityName: selectedClient.name,
        description: `Added initial placement: ${candidateName}. Salary: $${salaryAmount || 'Not specified'}. Notes: ${placementNotes || 'No notes provided'}`
      })

      await loadData()
      setShowAddPlacement(false)
      setSelectedCandidate('')
      setPlacementNotes('')
      setSalaryAmount('')
      showToast('Placement added successfully', 'success')
    } catch (error) {
      console.error('Error adding placement:', error)
      showToast('Failed to add placement', 'error')
    }
  }

  const handleAddReplacement = async () => {
    if (!selectedClient || !selectedCandidate) return

    const clientPlacements = placements.filter(p => p.client_id === selectedClient.id)
    const originalPlacement = clientPlacements.find(p => p.replacement_number === 0)
    
    if (clientPlacements.length >= 3) {
      showToast('Maximum 3 placements allowed', 'error')
      return
    }

    try {
      const candidateName = candidates.find(c => c.id === selectedCandidate)?.name
      const replacementNumber = Math.max(...clientPlacements.map(p => p.replacement_number)) + 1
      
      const { data: placementData, error } = await supabase
        .from('placements')
        .insert({
          client_id: selectedClient.id,
          candidate_id: selectedCandidate,
          placement_date: new Date().toISOString().split('T')[0],
          salary_amount: parseFloat(salaryAmount) || null,
          status: 'ACTIVE',
          original_placement_id: originalPlacement?.id || null,
          replacement_number: replacementNumber,
          notes: placementNotes,
          created_by: staff?.id
        })
        .select()
        .single()

      if (error) throw error

      // Log replacement addition
      await ActivityLogger.log({
        userId: staff?.id || '',
        actionType: 'create',
        entityType: 'client',
        entityId: selectedClient.id,
        entityName: selectedClient.name,
        description: `Added replacement #${replacementNumber}: ${candidateName}. Salary: $${salaryAmount || 'Not specified'}. Reason: ${placementNotes || 'No reason provided'}`
      })

      await loadData()
      setShowAddReplacement(false)
      setSelectedCandidate('')
      setPlacementNotes('')
      setSalaryAmount('')
      showToast('Replacement added successfully', 'success')
    } catch (error) {
      console.error('Error adding replacement:', error)
      showToast('Failed to add replacement', 'error')
    }
  }

  const updatePlacementStatus = async (placementId: string, status: string) => {
    try {
      const placement = placements.find(p => p.id === placementId)
      if (!placement) return

      const { error } = await supabase
        .from('placements')
        .update({
          status,
          updated_by: staff?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', placementId)

      if (error) throw error

      // Log status change
      await ActivityLogger.log({
        userId: staff?.id || '',
        actionType: 'status_change',
        entityType: 'client',
        entityId: placement.client_id,
        entityName: placement.candidate_name || '',
        oldValue: placement.status,
        newValue: status,
        description: `Placement status for ${placement.candidate_name} changed to ${status}`
      })

      await loadData()
      showToast(`Placement marked as ${status}`, 'success')
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('Failed to update status', 'error')
    }
  }



  const getClientPlacements = (clientId: string) => {
    return placements.filter(p => p.client_id === clientId).sort((a, b) => a.replacement_number - b.replacement_number)
  }





  const handleEditPlacement = async () => {
    if (!editingPlacement || !selectedCandidate) return

    try {
      const candidateName = candidates.find(c => c.id === selectedCandidate)?.name
      
      const { error } = await supabase
        .from('placements')
        .update({
          candidate_id: selectedCandidate,
          salary_amount: parseFloat(salaryAmount) || null,
          notes: placementNotes,
          updated_by: staff?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPlacement.id)

      if (error) throw error

      await ActivityLogger.log({
        userId: staff?.id || '',
        actionType: 'edit',
        entityType: 'client',
        entityId: editingPlacement.client_id,
        entityName: candidateName || '',
        description: `Updated placement: candidate changed from ${editingPlacement.candidate_name} to ${candidateName}, salary: $${salaryAmount || 'Not specified'}`
      })

      await loadData()
      setShowEditPlacement(false)
      setEditingPlacement(null)
      setSelectedCandidate('')
      setPlacementNotes('')
      setSalaryAmount('')
      showToast('Placement updated', 'success')
    } catch (error) {
      console.error('Error updating placement:', error)
      showToast('Failed to update placement', 'error')
    }
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
        <p className="text-gray-600">Manage placements and follow-ups for won clients</p>
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
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                      statusColors[client.placement_status as keyof typeof statusColors] || statusColors['Active']
                    }`}>
                      {client.placement_status || 'Active'}
                    </span>
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="text-xs text-gray-600 line-clamp-2">{client.want_to_hire}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {clientPlacements.length === 0 ? 'No placements' : `${clientPlacements.length} placement${clientPlacements.length !== 1 ? 's' : ''}`}
                  </p>
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
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto relative">
            <button
              onClick={() => {
                setShowDetailModal(false)
                setSelectedClient(null)
                setShowAddPlacement(false)
                setShowAddReplacement(false)
                setSelectedCandidate('')
                setPlacementNotes('')
              }}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
              title="Close"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Placement Management - {selectedClient.name}
              </h2>

              {/* Placement Fee & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Placement Fee</label>
                  <input
                    type="number"
                    value={placementFee}
                    onChange={(e) => {
                      setPlacementFee(e.target.value)
                      handleSavePlacement(parseFloat(e.target.value) || null)
                    }}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Placement Status</label>
                  <select
                    value={placementStatus}
                    onChange={(e) => {
                      setPlacementStatus(e.target.value)
                      handleSavePlacement(undefined, e.target.value)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  >
                    {placementStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Placements Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-semibold text-gray-900">Placements</h3>
                  {getClientPlacements(selectedClient.id).length === 0 ? (
                    <button
                      onClick={() => setShowAddPlacement(true)}
                      className="flex items-center px-3 py-1 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 text-sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Placement
                    </button>
                  ) : getClientPlacements(selectedClient.id).length < 3 && (
                    <button
                      onClick={() => setShowAddReplacement(true)}
                      className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Replacement
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {getClientPlacements(selectedClient.id).map((placement, index) => (
                    <div key={placement.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          placement.status === 'SUCCESS' ? 'bg-green-500' : 
                          placement.status === 'LOST' ? 'bg-red-500' : 'bg-blue-500'
                        }`}>
                          {placement.replacement_number === 0 ? 'O' : placement.replacement_number}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {placement.candidate_name}
                          {placement.replacement_number > 0 && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              Replacement #{placement.replacement_number}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">Started: {formatDateTime(placement.placement_date + 'T00:00:00')}</div>
                        {placement.salary_amount && (
                          <div className="text-sm text-gray-500">Salary: ${placement.salary_amount.toLocaleString()}</div>
                        )}
                        {placement.notes && (
                          <div className="text-sm text-gray-600 mt-1">Notes: {placement.notes}</div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingPlacement(placement)
                            setSelectedCandidate(placement.candidate_id)
                            setPlacementNotes(placement.notes || '')
                            setSalaryAmount(placement.salary_amount?.toString() || '')
                            setShowEditPlacement(true)
                          }}
                          className="p-2 rounded bg-gray-200 text-gray-600 hover:bg-gray-300"
                          title="Edit Placement"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => updatePlacementStatus(placement.id, 'SUCCESS')}
                          className={`p-2 rounded ${placement.status === 'SUCCESS' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}
                          title="Mark as Successful"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updatePlacementStatus(placement.id, 'LOST')}
                          className={`p-2 rounded ${placement.status === 'LOST' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'}`}
                          title="Mark as Lost"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>

                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Placement Form */}
                {showAddPlacement && (
                  <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Add Initial Placement</h4>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Salary Amount</label>
                        <input
                          type="number"
                          value={salaryAmount}
                          onChange={(e) => setSalaryAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          value={placementNotes}
                          onChange={(e) => setPlacementNotes(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          placeholder="Placement notes..."
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleAddPlacement}
                          disabled={!selectedCandidate}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Add Placement
                        </button>
                        <button
                          onClick={() => {
                            setShowAddPlacement(false)
                            setSelectedCandidate('')
                            setPlacementNotes('')
                            setSalaryAmount('')
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Add Replacement Form */}
                {showAddReplacement && (
                  <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Add Replacement</h4>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Salary Amount</label>
                        <input
                          type="number"
                          value={salaryAmount}
                          onChange={(e) => setSalaryAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Replacement</label>
                        <textarea
                          value={placementNotes}
                          onChange={(e) => setPlacementNotes(e.target.value)}
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
                          Add Replacement
                        </button>
                        <button
                          onClick={() => {
                            setShowAddReplacement(false)
                            setSelectedCandidate('')
                            setPlacementNotes('')
                            setSalaryAmount('')
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




            </div>
          </div>
        </div>
      )}



      {/* Edit Placement Modal */}
      {showEditPlacement && editingPlacement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit Placement
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select New Candidate</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Amount</label>
                  <input
                    type="number"
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={placementNotes}
                    onChange={(e) => setPlacementNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    placeholder="Update notes..."
                  />
                </div>
              </div>
              <div className="flex space-x-4 mt-6">
                <button
                  onClick={handleEditPlacement}
                  disabled={!selectedCandidate}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Update Placement
                </button>
                <button
                  onClick={() => {
                    setShowEditPlacement(false)
                    setEditingPlacement(null)
                    setSelectedCandidate('')
                    setPlacementNotes('')
                    setSalaryAmount('')
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