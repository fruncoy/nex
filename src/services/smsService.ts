import { supabase } from '../lib/supabase'

interface SMSRequest {
  recipientType: 'candidate' | 'staff' | 'client'
  recipientId?: string
  recipientName: string
  phoneNumber: string
  messageType: 'interview_reminder' | 'welcome' | 'notification' | 'bulk'
  messageContent: string
  sentBy: string
}

interface TextSMSResponse {
  responses: Array<{
    'respose-code': number
    'response-description': string
    mobile: string
    messageid?: number
    networkid?: string
  }>
}

class SMSService {
  private apiKey = import.meta.env.VITE_TEXTSMS_API_KEY
  private partnerID = import.meta.env.VITE_TEXTSMS_PARTNER_ID
  private endpoint = 'https://sms.textsms.co.ke/api/services/sendsms/'
  private balanceEndpoint = 'https://sms.textsms.co.ke/api/services/getbalance/'

  private formatPhoneNumber(phone: string): string {
    return phone.replace('+', '')
  }

  async sendSMS(request: SMSRequest): Promise<{ success: boolean; logId: string; error?: string }> {
    try {
      // Call our Supabase Edge Function instead of TextSMS directly
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(request)
      })

      const result = await response.json()
      return result

    } catch (error) {
      console.error('SMS Service Error:', error)
      return {
        success: false,
        logId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getAccountBalance(): Promise<{ balance?: number; error?: string }> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        }
      })

      const result = await response.json()
      return result
    } catch (error) {
      return { error: 'Failed to fetch balance' }
    }
  }

  async retryFailedSMS(logId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get SMS log
      const { data: log, error } = await supabase
        .from('sms_logs')
        .select('*')
        .eq('id', logId)
        .single()

      if (error || !log) return { success: false, error: 'SMS log not found' }

      // Check if should retry (not credits/credentials error)
      const noRetryErrors = [1004, 1006]
      if (noRetryErrors.includes(log.response_code)) {
        return { success: false, error: 'Cannot retry: Credits or credentials issue' }
      }

      // Retry SMS
      const result = await this.sendSMS({
        recipientType: log.recipient_type,
        recipientId: log.recipient_id,
        recipientName: log.recipient_name,
        phoneNumber: log.phone_number,
        messageType: log.message_type,
        messageContent: log.message_content,
        sentBy: log.sent_by
      })

      // Update retry count
      await supabase
        .from('sms_logs')
        .update({ retry_count: (log.retry_count || 0) + 1 })
        .eq('id', logId)

      return result
    } catch (error) {
      return { success: false, error: 'Retry failed' }
    }
  }

  generateInterviewReminderMessage(candidateName: string, interviewDay: string): string {
    const firstName = candidateName.split(' ')[0]
    return `${firstName}, this is a reminder from Nestara 'Your Circle of Care' that your interview is scheduled for ${interviewDay} at 9:00 AM. Karen Plains Arcade, 1st Flr. We look forward to meeting you!`
  }
}

export const smsService = new SMSService()