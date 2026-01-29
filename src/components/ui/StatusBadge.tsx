import React from 'react'

interface StatusBadgeProps {
  status: string
  type?: 'candidate' | 'client' | 'training' | 'interview' | 'lead' | 'payment'
}

export function StatusBadge({ status, type = 'candidate' }: StatusBadgeProps) {
  const getStatusColor = (status: string, type: string) => {
    const statusUpper = status.toUpperCase()

    const candidateStatusColors: Record<string, string> = {
      'WON': 'bg-green-100 text-green-800',
      'LOST': 'bg-red-100 text-red-800',
      'LOST - INTERVIEW LOST': 'bg-red-100 text-red-800',
      'LOST - MISSED INTERVIEW': 'bg-orange-100 text-orange-800',
      'LOST, AGE': 'bg-red-100 text-red-800',
      'LOST, NO REFERENCES': 'bg-red-100 text-red-800',
      'LOST, NO RESPONSE': 'bg-red-100 text-red-800', // Legacy support
      'LOST, PERSONALITY': 'bg-red-100 text-red-800',
      'LOST, SALARY': 'bg-red-100 text-red-800',
      'LOST, EXPERIENCE': 'bg-red-100 text-red-800',
      'LOST, NO GOOD CONDUCT': 'bg-red-100 text-red-800',
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'PENDING, APPLYING GC': 'bg-orange-100 text-orange-800',
      'INTERVIEW_SCHEDULED': 'bg-blue-100 text-blue-800',
      'BLACKLISTED': 'bg-gray-800 text-white',
      'ARCHIVED': 'bg-gray-200 text-gray-700'
    }

    const leadStatusColors: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'LOST': 'bg-red-100 text-red-800'
    }

    const clientStatusColors: Record<string, string> = {
      'CLIENT - ACTIVE': 'bg-blue-100 text-blue-800',
      'CLIENT - REVIEWING PROFILES': 'bg-blue-100 text-blue-800',
      'CLIENT - PROFILE SENT BUT NO RESPONSE': 'bg-yellow-100 text-yellow-800',
      'CLIENT - CONDUCTING TRIALS': 'bg-purple-100 text-purple-800',
      'CLIENT - PAYMENT PENDING': 'bg-orange-100 text-orange-800',
      'CLIENT - WON': 'bg-green-100 text-green-800',
      'CLIENT - LOST': 'bg-red-100 text-red-800',
      // Legacy support
      'PENDING - FORM NOT FILLED': 'bg-yellow-100 text-yellow-800',
      'PENDING - PAF NOT PAID': 'bg-yellow-100 text-yellow-800',
      'PENDING - SILENT AFTER PROFILES': 'bg-yellow-100 text-yellow-800',
      'ACTIVE - FORM FILLED, NO RESPONSE YET': 'bg-blue-100 text-blue-800',
      'ACTIVE - COMMUNICATION ONGOING': 'bg-blue-100 text-blue-800',
      'ACTIVE - PAYMENT PENDING': 'bg-blue-100 text-blue-800',
      'LOST/COLD - GHOSTED': 'bg-red-100 text-red-800',
      'LOST/COLD - BUDGET CONSTRAINTS': 'bg-red-100 text-red-800',
      'LOST/COLD - DISAPPOINTED WITH PROFILES': 'bg-red-100 text-red-800',
      
      // Single status format (for compatibility)
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'FORM NOT FILLED': 'bg-yellow-100 text-yellow-800',
      'PAF NOT PAID': 'bg-yellow-100 text-yellow-800',
      'SILENT AFTER PROFILES': 'bg-yellow-100 text-yellow-800',
      'ACTIVE': 'bg-blue-100 text-blue-800',
      'REVIEWING PROFILES': 'bg-blue-100 text-blue-800',
      'PROFILE SENT BUT NO RESPONSE': 'bg-yellow-100 text-yellow-800',
      'CONDUCTING TRIALS': 'bg-purple-100 text-purple-800',
      'FORM FILLED, NO RESPONSE YET': 'bg-blue-100 text-blue-800',
      'COMMUNICATION ONGOING': 'bg-blue-100 text-blue-800',
      'PAYMENT PENDING': 'bg-orange-100 text-orange-800',
      'WON': 'bg-green-100 text-green-800',
      'LOST': 'bg-red-100 text-red-800',
      'LOST/COLD': 'bg-red-100 text-red-800',
      'GHOSTED': 'bg-red-100 text-red-800',
      'BUDGET CONSTRAINTS': 'bg-red-100 text-red-800',
      'DISAPPOINTED WITH PROFILES': 'bg-red-100 text-red-800',
      
      // Legacy status support
      'A': 'bg-yellow-100 text-yellow-800',
      'A1': 'bg-yellow-100 text-yellow-800',
      'A2': 'bg-yellow-100 text-yellow-800',
      'A3': 'bg-yellow-100 text-yellow-800',
      'B': 'bg-blue-100 text-blue-800',
      'B1': 'bg-blue-100 text-blue-800',
      'B2': 'bg-blue-100 text-blue-800',
      'B3': 'bg-blue-100 text-blue-800',
      'C': 'bg-red-100 text-red-800',
      'C1': 'bg-red-100 text-red-800',
      'C2': 'bg-red-100 text-red-800',
      'C3': 'bg-red-100 text-red-800',
      'D': 'bg-green-100 text-green-800',
      'SCHEDULED': 'bg-green-100 text-green-800',
      'PROFILES-SENT': 'bg-green-100 text-green-800',
      'CLOSED-LOST': 'bg-red-100 text-red-800',
      'CALL-AGAIN-1-DAY': 'bg-blue-100 text-blue-800',
      'CALL-AGAIN-2-DAYS': 'bg-blue-100 text-blue-800',
      'CALL-AGAIN-3-DAYS': 'bg-blue-100 text-blue-800',
      'WILL-CALL-BACK': 'bg-yellow-100 text-yellow-800',
    }

    const trainingStatusColors: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'ACTIVE': 'bg-green-100 text-green-800',
      'SUSPENDED': 'bg-orange-100 text-orange-800',
      'EXPELLED': 'bg-red-100 text-red-800',
      'NEW': 'bg-blue-100 text-blue-800',
      'CONTACTED': 'bg-yellow-100 text-yellow-800',
      'INTERESTED': 'bg-green-100 text-green-800',
      'ENROLLED': 'bg-emerald-100 text-emerald-800',
      'COMPLETED': 'bg-purple-100 text-purple-800',
      'DROPPED-OFF': 'bg-red-100 text-red-800',
    }

    const interviewStatusColors: Record<string, string> = {
      'SCHEDULED': 'bg-blue-100 text-blue-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'WON': 'bg-green-100 text-green-800',
      'INTERVIEW_WON': 'bg-green-100 text-green-800',
      'LOST': 'bg-red-100 text-red-800',
      'INTERVIEW_LOST': 'bg-red-100 text-red-800',
      'MISSED': 'bg-orange-100 text-orange-800',
      'MISSED_INTERVIEW': 'bg-orange-100 text-orange-800',
      'RESCHEDULE': 'bg-purple-100 text-purple-800',
      'RESCHEDULE_INTERVIEW': 'bg-purple-100 text-purple-800',
      'NO-SHOW': 'bg-red-100 text-red-800',
      'NEEDS-ATTENTION': 'bg-red-100 text-red-800 border border-red-500',
    }

    const paymentStatusColors: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'PARTIAL': 'bg-orange-100 text-orange-800',
      'PAID': 'bg-green-100 text-green-800',
      'OVERDUE': 'bg-red-100 text-red-800',
    }

    const mapByType: Record<string, Record<string, string>> = {
      candidate: candidateStatusColors,
      lead: leadStatusColors,
      client: clientStatusColors,
      training: trainingStatusColors,
      interview: interviewStatusColors,
      payment: paymentStatusColors,
    }

    const colors = mapByType[type] || candidateStatusColors
    
    // First try exact match
    if (colors[statusUpper]) {
      return colors[statusUpper]
    }
    
    // For client type, try to get color from main status if it's in MainStatus - SubStatus format
    if (type === 'client' && status.includes(' - ')) {
      const mainStatus = status.split(' - ')[0].toUpperCase()
      if (mainStatus === 'PENDING') return 'bg-yellow-100 text-yellow-800'
      if (mainStatus === 'ACTIVE') return 'bg-blue-100 text-blue-800'
      if (mainStatus === 'LOST/COLD') return 'bg-red-100 text-red-800'
      if (mainStatus === 'WON') return 'bg-green-100 text-green-800'
    }
    
    return 'bg-gray-100 text-gray-800'
  }

  const formatStatusText = (status: string) => {
    // Format interview statuses to show full names
    if (type === 'interview') {
      switch (status.toUpperCase()) {
        case 'INTERVIEW_WON': return 'Interview Won'
        case 'INTERVIEW_LOST': return 'Interview Lost'
        case 'MISSED_INTERVIEW': return 'Missed Interview'
        case 'RESCHEDULE_INTERVIEW': return 'Reschedule Interview'
        case 'SCHEDULED': return 'Scheduled'
        case 'NEEDS-ATTENTION': return 'Needs Attention'
        default: return status
      }
    }
    
    // Format candidate statuses
    if (type === 'candidate') {
      switch (status.toUpperCase()) {
        case 'INTERVIEW_SCHEDULED': return 'Interview Scheduled'
        default: return status
      }
    }
    
    // Return the status as-is for other types
    return status
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status, type)}`}>
      {formatStatusText(status)}
    </span>
  )
}