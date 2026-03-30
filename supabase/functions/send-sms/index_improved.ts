import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const getStatusFromCode = (code: number) => {
  switch (code) {
    case 200: return 'delivered'
    case 1001: return 'failed_invalid_api'
    case 1002: return 'failed_invalid_partner'
    case 1003: return 'failed_invalid_number'
    case 1004: return 'failed_no_credits'
    case 1005: return 'failed_invalid_message'
    case 1006: return 'failed_auth_error'
    case 1007: return 'failed_network_error'
    default: return 'failed_unknown'
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  
  // Handle balance check
  if (url.pathname.endsWith('/balance')) {
    try {
      const balanceResponse = await fetch('https://sms.textsms.co.ke/api/services/getbalance/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apikey: Deno.env.get('TEXTSMS_API_KEY'),
          partnerID: Deno.env.get('TEXTSMS_PARTNER_ID')
        })
      })

      const result = await balanceResponse.json()
      
      return new Response(
        JSON.stringify({
          success: result['respose-code'] === 200,
          balance: result['respose-code'] === 200 ? parseFloat(result.balance) : null,
          error: result['respose-code'] !== 200 ? result['response-description'] : null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
  }

  // Handle SMS sending
  try {
    const { 
      recipientType, 
      recipientId, 
      recipientName, 
      phoneNumber, 
      messageType, 
      messageContent, 
      sentBy 
    } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create SMS log entry
    const { data: logData, error: logError } = await supabaseClient
      .from('sms_logs')
      .insert({
        recipient_type: recipientType,
        recipient_id: recipientId,
        recipient_name: recipientName,
        phone_number: phoneNumber,
        message_type: messageType,
        message_content: messageContent,
        sent_by: sentBy,
        status: 'sending'
      })
      .select()
      .single()

    if (logError) throw new Error('Failed to create SMS log')

    // Send SMS via TextSMS API
    const smsResponse = await fetch('https://sms.textsms.co.ke/api/services/sendsms/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: Deno.env.get('TEXTSMS_API_KEY'),
        partnerID: Deno.env.get('TEXTSMS_PARTNER_ID'),
        message: messageContent,
        shortcode: 'TextSMS',
        mobile: phoneNumber.replace('+', '')
      })
    })

    const result = await smsResponse.json()
    const smsResult = result.responses[0]
    const finalStatus = getStatusFromCode(smsResult['respose-code'])

    // Update SMS log with response
    await supabaseClient
      .from('sms_logs')
      .update({
        status: finalStatus,
        api_response: JSON.stringify(result),
        message_id: smsResult.messageid?.toString(),
        network_id: smsResult.networkid,
        response_code: smsResult['respose-code'],
        error_code: smsResult['respose-code'] !== 200 ? smsResult['response-description'] : null,
        sent_at: new Date().toISOString()
      })
      .eq('id', logData.id)

    return new Response(
      JSON.stringify({
        success: smsResult['respose-code'] === 200,
        logId: logData.id,
        status: finalStatus,
        error: smsResult['respose-code'] !== 200 ? smsResult['response-description'] : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        logId: '', 
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})