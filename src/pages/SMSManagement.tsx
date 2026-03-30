import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { smsService } from '../services/smsService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { RefreshCw, Filter, Search } from 'lucide-react'

interface SMSLog {
  id: string
  recipient_type: string
  recipient_name: string
  phone_number: string
  message_type: string
  message_content: string
  status: string
  response_code: number
  retry_count: number
  sent_at: string
  created_at: string
  staff?: { name: string }
}

export function SMSManagement() {
  const { staff } = useAuth()
  const { showToast } = useToast()
  
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<SMSLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set())
  const [showErrorCodes, setShowErrorCodes] = useState(false)

  useEffect(() => {
    loadSMSLogs()
  }, [])

  useEffect(() => {
    filterLogs()
  }, [smsLogs, searchTerm, statusFilter, typeFilter])

  const loadSMSLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('sms_logs')
        .select(`
          *,
          staff:sent_by (name)
        `)
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error
      setSmsLogs(data || [])
    } catch (error) {
      console.error('Error loading SMS logs:', error)
      showToast('Failed to load SMS logs', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filterLogs = () => {
    let filtered = [...smsLogs]

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.phone_number.includes(searchTerm) ||
        log.message_content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(log => log.message_type === typeFilter)
    }

    setFilteredLogs(filtered)
  }

  const handleRetry = async (logId: string) => {
    setRetryingIds(prev => new Set([...prev, logId]))
    
    try {
      const result = await smsService.retryFailedSMS(logId)
      if (result.success) {
        showToast('SMS retry successful', 'success')
        await loadSMSLogs()
      } else {
        showToast(`Retry failed: ${result.error}`, 'error')
      }
    } catch (error) {
      showToast('Retry failed', 'error')
    } finally {
      setRetryingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(logId)
        return newSet
      })
    }
  }

  const getStatusBadge = (status: string, responseCode?: number) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full"
    
    switch (status) {
      case 'sent':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'interview_reminder':
        return 'Interview Reminder'
      case 'welcome':
        return 'Welcome Message'
      case 'notification':
        return 'Notification'
      case 'bulk':
        return 'Bulk SMS'
      default:
        return type
    }
  }

  const stats = {
    total: smsLogs.length,
    sent: smsLogs.filter(log => log.status === 'sent').length,
    failed: smsLogs.filter(log => log.status === 'failed').length,
    today: smsLogs.filter(log => {
      const today = new Date().toDateString()
      return new Date(log.created_at).toDateString() === today
    }).length,
    thisWeek: smsLogs.filter(log => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(log.created_at) >= weekAgo
    }).length,
    interviewReminders: smsLogs.filter(log => log.message_type === 'interview_reminder').length,
    successRate: smsLogs.length > 0 ? Math.round((smsLogs.filter(log => log.status === 'sent').length / smsLogs.length) * 100) : 0,
    retryCount: smsLogs.reduce((sum, log) => sum + (log.retry_count || 0), 0),
    errorBreakdown: {
      invalidPhone: smsLogs.filter(log => log.response_code === 1003).length,
      lowCredits: smsLogs.filter(log => log.response_code === 1004).length,
      invalidCredentials: smsLogs.filter(log => log.response_code === 1006).length,
      invalidSender: smsLogs.filter(log => log.response_code === 1001).length,
      systemError: smsLogs.filter(log => [1005, 1007, 4090].includes(log.response_code)).length
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow h-24"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">SMS Management</h1>
          <p className="text-gray-600">Monitor SMS communications and error tracking</p>
        </div>
        <button
          onClick={() => setShowErrorCodes(!showErrorCodes)}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
        >
          {showErrorCodes ? 'Hide' : 'Show'} Error Codes ({stats.failed})
        </button>
      </div>

      {/* Error Codes Reference */}
      {showErrorCodes && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">TextSMS Response Codes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div><span className="font-mono text-green-600">200</span> - Successful Request Call</div>
            <div><span className="font-mono text-red-600">1001</span> - Invalid sender id <span className="text-gray-600">({stats.errorBreakdown.invalidSender} times)</span></div>
            <div><span className="font-mono text-red-600">1002</span> - Network not allowed</div>
            <div><span className="font-mono text-red-600">1003</span> - Invalid mobile number <span className="text-gray-600">({stats.errorBreakdown.invalidPhone} times)</span></div>
            <div><span className="font-mono text-orange-600">1004</span> - Low bulk credits <span className="text-gray-600">({stats.errorBreakdown.lowCredits} times)</span></div>
            <div><span className="font-mono text-red-600">1005</span> - Failed. System error <span className="text-gray-600">({stats.errorBreakdown.systemError} times)</span></div>
            <div><span className="font-mono text-orange-600">1006</span> - Invalid credentials <span className="text-gray-600">({stats.errorBreakdown.invalidCredentials} times)</span></div>
            <div><span className="font-mono text-red-600">1007</span> - Failed. System error</div>
            <div><span className="font-mono text-gray-600">1008</span> - No Delivery Report</div>
            <div><span className="font-mono text-red-600">1009</span> - Unsupported data type</div>
            <div><span className="font-mono text-red-600">1010</span> - Unsupported request type</div>
            <div><span className="font-mono text-red-600">4090</span> - Internal Error. Try again after 5 minutes</div>
            <div><span className="font-mono text-red-600">4091</span> - No Partner ID is Set</div>
            <div><span className="font-mono text-red-600">4092</span> - No API KEY Provided</div>
            <div><span className="font-mono text-red-600">4093</span> - Details Not Found</div>
          </div>
          <p className="text-xs text-gray-600 mt-3">
            <strong>Note:</strong> These error codes are saved in SMS logs with exact counts shown above. Most common issues are invalid phone numbers (1003) and low credits (1004).
          </p>
        </div>
      )}

      {/* Server Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-emerald-500 p-6 rounded-lg shadow-sm text-white">
          <p className="text-sm font-medium opacity-90">Success Rate</p>
          <p className="text-2xl font-bold">{stats.successRate}%</p>
        </div>

        <div className="bg-red-500 p-6 rounded-lg shadow-sm text-white">
          <p className="text-sm font-medium opacity-90">Failed</p>
          <p className="text-2xl font-bold">{stats.failed}</p>
        </div>

        <div className="bg-gray-500 p-6 rounded-lg shadow-sm text-white">
          <p className="text-sm font-medium opacity-90">Total Retries</p>
          <p className="text-2xl font-bold">{stats.retryCount}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-500 p-6 rounded-lg shadow-sm text-white">
          <p className="text-sm font-medium opacity-90">Total SMS</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>

        <div className="bg-purple-500 p-6 rounded-lg shadow-sm text-white">
          <p className="text-sm font-medium opacity-90">Today</p>
          <p className="text-2xl font-bold">{stats.today}</p>
        </div>

        <div className="bg-orange-500 p-6 rounded-lg shadow-sm text-white">
          <p className="text-sm font-medium opacity-90">This Week</p>
          <p className="text-2xl font-bold">{stats.thisWeek}</p>
        </div>

        <div className="bg-indigo-500 p-6 rounded-lg shadow-sm text-white">
          <p className="text-sm font-medium opacity-90">Interview Reminders</p>
          <p className="text-2xl font-bold">{stats.interviewReminders}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, phone, or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="interview_reminder">Interview Reminder</option>
            <option value="welcome">Welcome Message</option>
            <option value="notification">Notification</option>
            <option value="bulk">Bulk SMS</option>
          </select>
        </div>
      </div>

      {/* SMS Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{log.recipient_name}</div>
                      <div className="text-sm text-gray-500">{log.phone_number}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                      {getMessageTypeLabel(log.message_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate" title={log.message_content}>
                      {log.message_content}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadge(log.status, log.response_code)}>
                      {log.status}
                    </span>
                    {log.retry_count > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Retried {log.retry_count}x
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.staff?.name || 'System'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {log.status === 'failed' && log.response_code !== 1004 && log.response_code !== 1006 && (
                      <button
                        onClick={() => handleRetry(log.id)}
                        disabled={retryingIds.has(log.id)}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                      >
                        {retryingIds.has(log.id) ? 'Retrying...' : 'Retry'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredLogs.length === 0 && (
        <div className="text-center py-12">
          <h3 className="mt-2 text-sm font-medium text-gray-900">No SMS logs found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'SMS logs will appear here once messages are sent.'
            }
          </p>
        </div>
      )}
    </div>
  )
}