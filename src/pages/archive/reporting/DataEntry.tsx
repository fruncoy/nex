import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Save, Calendar, TrendingUp, Target, MessageSquare } from 'lucide-react'

interface KPITarget {
  id: string
  role: string
  kpi_name: string
  target_value: number
  unit: string
  is_inverse: boolean
  requires_event_date: boolean
}

interface KPIEntry {
  kpi_name: string
  actual_value: string
  comments: string
  actual_event_date: string
}

export function DataEntry() {
  const [kpiTargets, setKpiTargets] = useState<KPITarget[]>([])
  const [selectedRole, setSelectedRole] = useState('')
  const [kpiEntries, setKpiEntries] = useState<Record<string, KPIEntry>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [roles, setRoles] = useState<string[]>([])

  const { user } = useAuth()

  useEffect(() => {
    loadKPITargets()
  }, [])

  useEffect(() => {
    if (selectedRole) {
      loadKPIsByRole(selectedRole)
    }
  }, [selectedRole])

  const loadKPITargets = async () => {
    try {
      const { data, error } = await supabase
        .from('kpi_targets')
        .select('*')
        .order('role', { ascending: true })
        .order('kpi_name', { ascending: true })

      if (error) throw error

      const uniqueRoles = [...new Set(data?.map(kpi => kpi.role) || [])]
      setRoles(uniqueRoles)
      setKpiTargets(data || [])
      
      if (uniqueRoles.length > 0 && !selectedRole) {
        setSelectedRole(uniqueRoles[0])
      }
    } catch (error) {
      console.error('Error loading KPI targets:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadKPIsByRole = (role: string) => {
    const roleKPIs = kpiTargets.filter(kpi => kpi.role === role)
    const initialEntries: Record<string, KPIEntry> = {}
    
    roleKPIs.forEach(kpi => {
      initialEntries[kpi.kpi_name] = {
        kpi_name: kpi.kpi_name,
        actual_value: '',
        comments: '',
        actual_event_date: ''
      }
    })
    
    setKpiEntries(initialEntries)
  }

  const calculateVarianceAndRAG = (actual: number, target: number, isInverse: boolean) => {
    let variance: number
    let ragStatus: string

    if (isInverse) {
      // For inverse KPIs (lower is better)
      variance = ((target - actual) / target) * 100
      if (actual <= target) {
        ragStatus = 'Green'
      } else if (actual <= target * 1.2) {
        ragStatus = 'Amber'
      } else {
        ragStatus = 'Red'
      }
    } else {
      // For normal KPIs (higher is better)
      variance = ((actual - target) / target) * 100
      if (actual >= target) {
        ragStatus = 'Green'
      } else if (actual >= target * 0.8) {
        ragStatus = 'Amber'
      } else {
        ragStatus = 'Red'
      }
    }

    return { variance, ragStatus }
  }

  const handleEdit = (recordId: string) => {
    // TODO: Implement edit functionality
    console.log('Edit record:', recordId)
  }

  const handleDelete = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this KPI record?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('kpi_records')
        .delete()
        .eq('id', recordId)

      if (error) throw error

      alert('KPI record deleted successfully')
      // Reload data if needed
    } catch (error) {
      console.error('Error deleting KPI record:', error)
      alert('Error deleting KPI record. Please try again.')
    }
  }

  const handleInputChange = (kpiName: string, field: keyof KPIEntry, value: string) => {
    setKpiEntries(prev => ({
      ...prev,
      [kpiName]: {
        ...prev[kpiName],
        [field]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const records = []
      
      for (const [kpiName, entry] of Object.entries(kpiEntries)) {
        if (entry.actual_value.trim() === '') continue

        const kpiTarget = kpiTargets.find(kpi => kpi.kpi_name === kpiName && kpi.role === selectedRole)
        if (!kpiTarget) continue

        const actualValue = parseFloat(entry.actual_value)
        if (isNaN(actualValue)) continue

        const { variance, ragStatus } = calculateVarianceAndRAG(
          actualValue,
          kpiTarget.target_value,
          kpiTarget.is_inverse
        )

        records.push({
          role: selectedRole,
          kpi_name: kpiName,
          actual_value: actualValue,
          comments: entry.comments || null,
          variance: Math.round(variance * 100) / 100, // Round to 2 decimal places
          rag_status: ragStatus,
          actual_event_date: entry.actual_event_date || null,
          created_by: user?.id
        })
      }

      if (records.length === 0) {
        alert('Please enter at least one KPI value')
        return
      }

      const { error } = await supabase
        .from('kpi_records')
        .insert(records)

      if (error) throw error

      // Reset form
      loadKPIsByRole(selectedRole)
      alert(`Successfully saved ${records.length} KPI record(s)`)
    } catch (error) {
      console.error('Error saving KPI records:', error)
      alert('Error saving KPI records. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getRoleKPIs = () => {
    return kpiTargets.filter(kpi => kpi.role === selectedRole)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nestalk-primary"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Role Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Role</label>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
        >
          <option value="">Select a role</option>
          {roles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>

      {selectedRole && (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {getRoleKPIs().map((kpi) => (
              <div key={kpi.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{kpi.kpi_name}</h3>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <Target className="w-4 h-4 mr-1" />
                      <span>Target: {kpi.target_value} {kpi.unit}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Actual Value ({kpi.unit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={kpiEntries[kpi.kpi_name]?.actual_value || ''}
                      onChange={(e) => handleInputChange(kpi.kpi_name, 'actual_value', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                      placeholder="Enter actual value"
                    />
                  </div>

                  {kpi.requires_event_date && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Event Date
                      </label>
                      <input
                        type="date"
                        value={kpiEntries[kpi.kpi_name]?.actual_event_date || ''}
                        onChange={(e) => handleInputChange(kpi.kpi_name, 'actual_event_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comments (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={kpiEntries[kpi.kpi_name]?.comments || ''}
                      onChange={(e) => handleInputChange(kpi.kpi_name, 'comments', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                      placeholder="Add any comments..."
                    />
                  </div>
                </div>

                {kpi.is_inverse && (
                  <div className="mt-3 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    <MessageSquare className="w-3 h-3 inline mr-1" />
                    Lower values are better for this KPI
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center px-6 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {submitting ? 'Saving...' : 'Save KPI Records'}
            </button>
          </div>
        </form>
      )}

      {!selectedRole && (
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Select a Role</h3>
          <p className="mt-1 text-sm text-gray-500">
            Choose a role above to start entering KPI data.
          </p>
        </div>
      )}
    </div>
  )
}