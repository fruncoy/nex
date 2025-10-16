import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle, XCircle, Plus, User, DollarSign, Calendar, Search, Filter, Grid3X3, List, Clock, AlertTriangle, Eye, Edit } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { formatDateTime } from '../utils/dateFormat'

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

interface PlacementFollowup {
  id: string
  client_id: string
  placement_id: string
  followup_type: string
  scheduled_date: string
  completed: boolean
  completed_at: string | null
  notes: string
  status: 'overdue' | 'due_today' | 'upcoming' | 'completed'
  client_name: string
  candidate_name: string
}

export function ConvertedClients() {
  const [clients, setClients] = useState<ConvertedClient[]>([])
  const [placements, setPlacements] = useState<Placement[]>([])
  const [followups, setFollowups] = useState<PlacementFollowup[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<ConvertedClient | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showFollowupModal, setShowFollowupModal] = useState(false)
  const [placementFee, setPlacementFee] = useState('')
  const [placementStatus, setPlacementStatus] = useState('Active')
  const [showAddPlacement, setShowAddPlacement] = useState(false)
  const [showAddReplacement, setShowAddReplacement] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState('')
  const [placementNotes, setPlacementNotes] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedFollowup, setSelectedFollowup] = useState<PlacementFollowup | null>(null)
  const [followupNotes, setFollowupNotes] = useState('')
  const [showEditPlacement, setShowEditPlacement] = useState(false)
  const [editingPlacement, setEditingPlacement] = useState<Placement | null>(null)
  const [showNewHireRequest, setShowNewHireRequest] = useState(false)
  const [newHireRole, setNewHireRole] = useState('')

  const { showToast } = useToast()
  const { staff } = useAuth()

  const placementStatuses = ['Active', 'Lost (Refunded)', 'Lost (No Refund)']
  const outcomes = ['Active', 'Successful', 'Failed']

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [clientsRes, placementsRes, followupsRes, candidatesRes] = await Promise.all([
        supabase.from('clients').select('*').eq('status', 'Won'),
        supabase.from('client_placements').select('*, candidates(name)').order('placement_order'),
        supabase.from('placement_followup_dashboard').select('*'),
        supabase.from('candidates').select('id, name').eq('status', 'WON')
      ])

      setClients(clientsRes.data || [])
      setPlacements(placementsRes.data || [])
      setFollowups(followupsRes.data || [])
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

      // Close all follow-ups if status changed to lost
      if (status !== oldStatus && (status === 'Lost (Refunded)' || status === 'Lost (No Refund)')) {
        await supabase
          .from('placement_followups')
          .update({ 
            completed: true, 
            completed_at: new Date().toISOString(),
            notes: `Auto-closed: Placement status changed to ${status}`,
            updated_by: staff?.id
          })
          .eq('client_id', selectedClient.id)
          .eq('completed', false)

        // Log follow-up closures
        await supabase.from('updates').insert({
          linked_to_type: 'client',
          linked_to_id: selectedClient.id,
          user_id: staff?.id,
          update_text: `All pending follow-ups auto-closed due to placement status change to ${status}`,
          created_at: new Date().toISOString()
        })
      }

      // Log changes
      const logs = []
      if (oldFee !== fee) {
        logs.push({
          linked_to_type: 'client',
          linked_to_id: selectedClient.id,
          user_id: staff?.id,
          update_text: `Placement fee updated from $${oldFee || 0} to $${fee || 0}`,
          created_at: new Date().toISOString()
        })
      }
      if (oldStatus !== status) {
        logs.push({
          linked_to_type: 'client',
          linked_to_id: selectedClient.id,
          user_id: staff?.id,
          update_text: `Placement status changed from ${oldStatus || 'Active'} to ${status}`,
          created_at: new Date().toISOString()
        })
      }

      if (logs.length > 0) {
        await supabase.from('updates').insert(logs)
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
        .from('client_placements')
        .insert({
          client_id: selectedClient.id,
          candidate_id: selectedCandidate,
          candidate_name: candidateName,
          placement_order: 1,
          outcome: 'Active',
          start_date: new Date().toISOString().split('T')[0],
          notes: placementNotes,
          created_by: staff?.id
        })
        .select()
        .single()

      if (error) throw error

      // Create follow-up schedule (every 2 weeks for 3 months = 6 follow-ups)
      const followups = []
      for (let i = 1; i <= 6; i++) {
        const followupDate = new Date()
        followupDate.setDate(followupDate.getDate() + (i * 14)) // Every 2 weeks
        
        followups.push({
          client_id: selectedClient.id,
          placement_id: placementData.id,
          followup_type: `${i * 2}_week`,
          scheduled_date: followupDate.toISOString().split('T')[0],
          completed: false,
          created_by: staff?.id
        })
      }

      await supabase.from('placement_followups').insert(followups)

      // Log placement addition
      await supabase.from('updates').insert({
        linked_to_type: 'client',
        linked_to_id: selectedClient.id,
        user_id: staff?.id,
        update_text: `Added initial placement: ${candidateName} with 6 follow-ups scheduled. Notes: ${placementNotes || 'No notes provided'}`,
        created_at: new Date().toISOString()
      })

      await loadData()
      setShowAddPlacement(false)
      setSelectedCandidate('')
      setPlacementNotes('')
      showToast('Placement added with follow-up schedule', 'success')
    } catch (error) {
      console.error('Error adding placement:', error)
      showToast('Failed to add placement', 'error')
    }
  }

  const handleAddReplacement = async () => {
    if (!selectedClient || !selectedCandidate) return

    const clientPlacements = placements.filter(p => p.client_id === selectedClient.id)
    if (clientPlacements.length >= 3) {
      showToast('Maximum 3 placements allowed', 'error')
      return
    }

    try {
      const candidateName = candidates.find(c => c.id === selectedCandidate)?.name
      
      const { data: placementData, error } = await supabase
        .from('client_placements')
        .insert({
          client_id: selectedClient.id,
          candidate_id: selectedCandidate,
          candidate_name: candidateName,
          placement_order: clientPlacements.length + 1,
          outcome: 'Active',
          start_date: new Date().toISOString().split('T')[0],
          notes: placementNotes,
          created_by: staff?.id
        })
        .select()
        .single()

      if (error) throw error

      // Create follow-up schedule for replacement
      const followups = []
      for (let i = 1; i <= 6; i++) {
        const followupDate = new Date()
        followupDate.setDate(followupDate.getDate() + (i * 14))
        
        followups.push({
          client_id: selectedClient.id,
          placement_id: placementData.id,
          followup_type: `${i * 2}_week`,
          scheduled_date: followupDate.toISOString().split('T')[0],
          completed: false,
          created_by: staff?.id
        })
      }

      await supabase.from('placement_followups').insert(followups)

      // Log replacement addition
      await supabase.from('updates').insert({
        linked_to_type: 'client',
        linked_to_id: selectedClient.id,
        user_id: staff?.id,
        update_text: `Added replacement candidate: ${candidateName} with new follow-up schedule. Reason: ${placementNotes || 'No reason provided'}`,
        created_at: new Date().toISOString()
      })

      await loadData()
      setShowAddReplacement(false)
      setSelectedCandidate('')
      setPlacementNotes('')
      showToast('Replacement added with follow-up schedule', 'success')
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
          end_date: outcome === 'Failed' || outcome === 'Successful' ? new Date().toISOString().split('T')[0] : null,
          updated_by: staff?.id
        })
        .eq('id', placementId)

      if (error) throw error

      // Close all follow-ups for this placement if marked as successful or failed
      if (outcome === 'Successful' || outcome === 'Failed') {
        await supabase
          .from('placement_followups')
          .update({ 
            completed: true, 
            completed_at: new Date().toISOString(),
            notes: `Auto-closed: Placement marked as ${outcome}`,
            updated_by: staff?.id
          })
          .eq('placement_id', placementId)
          .eq('completed', false)
      }

      // Log outcome change
      await supabase.from('updates').insert({
        linked_to_type: 'client',
        linked_to_id: placement.client_id,
        user_id: staff?.id,
        update_text: `Placement outcome for ${placement.candidate_name} marked as ${outcome}${outcome === 'Failed' || outcome === 'Successful' ? ' - Follow-ups closed' : ''}`,
        created_at: new Date().toISOString()
      })

      await loadData()
      showToast(`Placement marked as ${outcome}${outcome === 'Failed' || outcome === 'Successful' ? ' and follow-ups closed' : ''}`, 'success')
    } catch (error) {
      console.error('Error updating outcome:', error)
      showToast('Failed to update outcome', 'error')
    }
  }

  const handleFollowupComplete = async (followupId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('placement_followups')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          notes: notes,
          updated_by: staff?.id
        })
        .eq('id', followupId)

      if (error) throw error

      await loadData()
      showToast('Follow-up marked as completed', 'success')
    } catch (error) {
      console.error('Error completing follow-up:', error)
      showToast('Failed to complete follow-up', 'error')
    }
  }

  const getClientPlacements = (clientId: string) => {
    return placements.filter(p => p.client_id === clientId).sort((a, b) => a.placement_order - b.placement_order)
  }

  const getClientFollowups = (clientId: string) => {
    return followups.filter(f => f.client_id === clientId).sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
  }

  const getFollowupTypeLabel = (type: string) => {
    const labels = {
      '2_week': '2 Weeks',
      '4_week': '4 Weeks', 
      '6_week': '6 Weeks',
      '8_week': '8 Weeks',
      '10_week': '10 Weeks',
      '12_week': '12 Weeks',
      // Legacy labels (in case migration hasn't run)
      '1_week': '2 Weeks',
      '3_week': '6 Weeks',
      '1_month': '8 Weeks'
    }
    return labels[type as keyof typeof labels] || type
  }

  const handleEditPlacement = async () => {
    if (!editingPlacement || !selectedCandidate) return

    try {
      const candidateName = candidates.find(c => c.id === selectedCandidate)?.name
      
      const { error } = await supabase
        .from('client_placements')
        .update({
          candidate_id: selectedCandidate,
          candidate_name: candidateName,
          notes: placementNotes,
          updated_by: staff?.id
        })
        .eq('id', editingPlacement.id)

      if (error) throw error

      await supabase.from('updates').insert({
        linked_to_type: 'client',
        linked_to_id: editingPlacement.client_id,
        user_id: staff?.id,
        update_text: `Updated placement candidate from ${editingPlacement.candidate_name} to ${candidateName}`,
        created_at: new Date().toISOString()
      })

      await loadData()
      setShowEditPlacement(false)
      setEditingPlacement(null)
      setSelectedCandidate('')
      setPlacementNotes('')
      showToast('Placement updated', 'success')
    } catch (error) {
      console.error('Error updating placement:', error)
      showToast('Failed to update placement', 'error')
    }
  }

  const handleNewHireRequest = async () => {
    if (!selectedClient || !newHireRole) return

    try {
      const { error } = await supabase
        .from('clients')
        .insert({
          name: `${selectedClient.name} (Additional Role)`,
          phone: selectedClient.phone,
          gmail: selectedClient.gmail,
          source: 'Existing Client',
          want_to_hire: newHireRole,
          status: 'Won',
          placement_status: 'Active',
          inquiry_date: new Date().toISOString().split('T')[0]
        })

      if (error) throw error

      await supabase.from('updates').insert({
        linked_to_type: 'client',
        linked_to_id: selectedClient.id,
        user_id: staff?.id,
        update_text: `Client requested additional hire for role: ${newHireRole}`,
        created_at: new Date().toISOString()
      })

      await loadData()
      setShowNewHireRequest(false)
      setNewHireRole('')
      showToast('New hire request created', 'success')
    } catch (error) {
      console.error('Error creating new hire request:', error)
      showToast('Failed to create new hire request', 'error')
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

      {/* Follow-up Alerts */}
      {followups.filter(f => f.status === 'overdue' || f.status === 'due_today').length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="text-sm font-medium text-yellow-800">Follow-up Reminders</h3>
          </div>
          <div className="space-y-2">
            {followups
              .filter(f => f.status === 'overdue' || f.status === 'due_today')
              .slice(0, 3)
              .map(followup => (
                <div key={followup.id} className="flex items-center justify-between text-sm">
                  <span className="text-yellow-700">
                    {followup.client_name} - {followup.candidate_name} ({getFollowupTypeLabel(followup.followup_type)})
                    {followup.status === 'overdue' ? ' - OVERDUE' : ' - DUE TODAY'}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedFollowup(followup)
                      setFollowupNotes('')
                      setShowFollowupModal(true)
                    }}
                    className="text-yellow-600 hover:text-yellow-800 text-xs px-2 py-1 border border-yellow-300 rounded"
                  >
                    Complete
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

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
            const clientFollowups = getClientFollowups(client.id)
            const overdueFollowups = clientFollowups.filter(f => f.status === 'overdue' || f.status === 'due_today')
            
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
                    {overdueFollowups.length > 0 && (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 border-red-200">
                        {overdueFollowups.length} Due
                      </span>
                    )}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Follow-ups</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => {
                  const clientPlacements = getClientPlacements(client.id)
                  const clientFollowups = getClientFollowups(client.id)
                  const overdueFollowups = clientFollowups.filter(f => f.status === 'overdue' || f.status === 'due_today')
                  
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {overdueFollowups.length > 0 ? (
                          <span className="text-red-600 font-medium">{overdueFollowups.length} due</span>
                        ) : (
                          <span className="text-gray-500">Up to date</span>
                        )}
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
                          placement.outcome === 'Successful' ? 'bg-green-500' : 
                          placement.outcome === 'Failed' ? 'bg-red-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{placement.candidate_name}</div>
                        <div className="text-sm text-gray-500">Started: {formatDateTime(placement.start_date + 'T00:00:00')}</div>
                        {placement.end_date && (
                          <div className="text-sm text-gray-500">Ended: {formatDateTime(placement.end_date + 'T00:00:00')}</div>
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
                            setShowEditPlacement(true)
                          }}
                          className="p-2 rounded bg-gray-200 text-gray-600 hover:bg-gray-300"
                          title="Edit Placement"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

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

              {/* Follow-ups Section */}
              <div className="mb-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Follow-up Schedule</h3>
                <div className="space-y-2">
                  {getClientFollowups(selectedClient.id).map((followup) => (
                    <div key={followup.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                      followup.status === 'overdue' ? 'bg-red-50 border-red-200' :
                      followup.status === 'due_today' ? 'bg-yellow-50 border-yellow-200' :
                      followup.completed ? 'bg-green-50 border-green-200' :
                      'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {followup.candidate_name} - {getFollowupTypeLabel(followup.followup_type)} Check
                        </div>
                        <div className="text-sm text-gray-500">
                          Scheduled: {formatDateTime(followup.scheduled_date)}
                          {followup.completed && followup.completed_at && (
                            <span className="ml-2 text-green-600">
                              (Completed: {formatDateTime(followup.completed_at)})
                            </span>
                          )}
                        </div>
                        {followup.notes && (
                          <div className="text-sm text-gray-600 mt-1">Notes: {followup.notes}</div>
                        )}
                      </div>
                      {!followup.completed && (
                        <button
                          onClick={() => {
                            setSelectedFollowup(followup)
                            setFollowupNotes('')
                            setShowFollowupModal(true)
                          }}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

               {/* Close Button */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedClient(null)
                    setShowAddPlacement(false)
                    setShowAddReplacement(false)
                    setSelectedCandidate('')
                    setPlacementNotes('')
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Close"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Completion Modal */}
      {showFollowupModal && selectedFollowup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Complete Follow-up
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  {selectedFollowup.client_name} - {selectedFollowup.candidate_name}
                </p>
                <p className="text-sm text-gray-600">
                  {getFollowupTypeLabel(selectedFollowup.followup_type)} Check
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  placeholder="Follow-up notes..."
                />
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    handleFollowupComplete(selectedFollowup.id, followupNotes)
                    setShowFollowupModal(false)
                    setSelectedFollowup(null)
                    setFollowupNotes('')
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Mark Complete
                </button>
                <button
                  onClick={() => {
                    setShowFollowupModal(false)
                    setSelectedFollowup(null)
                    setFollowupNotes('')
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

      {/* New Hire Request Modal */}
      {showNewHireRequest && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Request Additional Hire
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Create a new hire request for {selectedClient.name}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role Needed</label>
                  <select
                    value={newHireRole}
                    onChange={(e) => setNewHireRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  >
                    <option value="">Select role...</option>
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
              <div className="flex space-x-4 mt-6">
                <button
                  onClick={handleNewHireRequest}
                  disabled={!newHireRole}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Create Request
                </button>
                <button
                  onClick={() => {
                    setShowNewHireRequest(false)
                    setNewHireRole('')
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