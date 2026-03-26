import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { SearchFilter } from '../../components/ui/SearchFilter'
import { Calendar, Filter, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPIRecord {
  id: string
  role: string
  kpi_name: string
  actual_value: number
  variance: number
  rag_status: string
  comments: string | null
  recorded_at: string
  actual_event_date: string | null
  staff?: {
    name: string
    username: string
  }
}

export function Reports() {
  const [records, setRecords] = useState<KPIRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<KPIRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterMonth, setFilterMonth] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [roles, setRoles] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage] = useState(20)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  useEffect(() => {
    loadRecords()
  const handleEdit = (record: KPIRecord) => {
    // TODO: Implement edit functionality - could open a modal with pre-filled form
    console.log('Edit record:', record)
    alert('Edit functionality will be implemented. For now, you can add a new record to correct the data.')
  }

  const handleDelete = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this KPI record? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('kpi_records')
        .delete()
        .eq('id', recordId)

      if (error) throw error

      alert('KPI record deleted successfully')
      loadRecords() // Reload the data
    } catch (error) {
      console.error('Error deleting KPI record:', error)
      alert('Error deleting KPI record. Please try again.')
    }
  }

  }, [])

  useEffect(() => {
    filterRecords()
  }, [records, searchTerm, filterRole, filterMonth, dateRange])

  const loadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('kpi_records')
        .select(`
          *,
          staff:created_by (name, username)
        `)
        .order('recorded_at', { ascending: false })

      if (error) throw error

      const uniqueRoles = [...new Set(data?.map(record => record.role) || [])]
      setRoles(uniqueRoles)
      setRecords(data || [])
    } catch (error) {
      console.error('Error loading KPI records:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterRecords = () => {
    let filtered = records

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.kpi_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.comments?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(record => record.role === filterRole)
    }

    // Month filter
    if (filterMonth) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.recorded_at)
        const filterDate = new Date(filterMonth)
        return recordDate.getMonth() === filterDate.getMonth() && 
               recordDate.getFullYear() === filterDate.getFullYear()
      })
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.recorded_at).toISOString().split('T')[0]
        return recordDate >= dateRange.start && recordDate <= dateRange.end
      })
    }

    setFilteredRecords(filtered)
    setCurrentPage(1)
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })

    const sorted = [...filteredRecords].sort((a, b) => {
      let aValue: any = a[key as keyof KPIRecord]
      let bValue: any = b[key as keyof KPIRecord]

      if (key === 'recorded_at') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1
      if (aValue > bValue) return direction === 'asc' ? 1 : -1
      return 0
    })

    setFilteredRecords(sorted)
  }

  const getRAGColor = (status: string) => {
    switch (status) {
      case 'Green':
        return 'bg-green-100 text-green-800'
      case 'Amber':
        return 'bg-yellow-100 text-yellow-800'
      case 'Red':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="w-4 h-4 text-green-600" />
    if (variance < 0) return <TrendingDown className="w-4 h-4 text-red-600" />
    return <Minus className="w-4 h-4 text-gray-600" />
  }

  const exportToCSV = () => {
    const headers = ['Role', 'KPI', 'Actual Value', 'Variance %', 'RAG Status', 'Comments', 'Recorded At', 'Event Date']
    const csvData = filteredRecords.map(record => [
      record.role,
      record.kpi_name,
      record.actual_value,
      `${record.variance}%`,
      record.rag_status,
      record.comments || '',
      new Date(record.recorded_at).toLocaleString(),
      record.actual_event_date ? new Date(record.actual_event_date).toLocaleDateString() : ''
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kpi-reports-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Pagination
  const indexOfLastRecord = currentPage * recordsPerPage
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord)
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nestalk-primary"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filterStatus={filterRole}
              onFilterChange={setFilterRole}
              statusOptions={roles}
              placeholder="Search by role, KPI name, or comments..."
            />
          </div>
          
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Showing {indexOfFirstRecord + 1}-{Math.min(indexOfLastRecord, filteredRecords.length)} of {filteredRecords.length} records
          </p>
          
          {/* Export removed per request */}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('role')}
                >
                  Role
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('kpi_name')}
                >
                  KPI
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('actual_value')}
                >
                  Actual Value
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('variance')}
                >
                  Variance
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('rag_status')}
                >
                  RAG Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comments
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('recorded_at')}
                >
                  Recorded At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {record.role}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.kpi_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.actual_value}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      {getVarianceIcon(record.variance)}
                      <span className="ml-1">{record.variance.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRAGColor(record.rag_status)}`}>
                      {record.rag_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {record.comments || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      {new Date(record.recorded_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(record.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(record)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {filteredRecords.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No records found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterRole !== 'all' || filterMonth || dateRange.start || dateRange.end
              ? 'Try adjusting your search or filter criteria.'
              : 'No KPI records have been entered yet.'
            }
          </p>
        </div>
      )}
    </div>
  )
}