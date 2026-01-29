import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  
  // Handle balance check
  if (url.pathname.endsWith('/balance')) {
    try {
      const balanceResponse = await fetch('https://isms.celcomafrica.com/api/services/getbalance/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apikey: Deno.env.get('CELECOM_API_KEY'),
          partnerID: Deno.env.get('CELECOM_PARTNER_ID')
        })
      })

      const result = await balanceResponse.json()
      
      return new Response(
        JSON.stringify({
          balance: parseFloat(result.balance) || 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch balance' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
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
        status: 'pending'
      })
      .select()
      .single()

    if (logError) throw new Error('Failed to create SMS log')

    // Send SMS via Celecom API
    const smsResponse = await fetch('https://isms.celcomafrica.com/api/services/sendsms/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apikey: Deno.env.get('CELECOM_API_KEY'),
        partnerID: Deno.env.get('CELECOM_PARTNER_ID'),
        message: messageContent,
        shortcode: 'NESTARA',
        mobile: phoneNumber.replace('+', ''),
        pass_type: 'plain'
      })
    })

    const result = await smsResponse.json()
    const smsResult = result.responses[0]

    // Update SMS log with response
    await supabaseClient
      .from('sms_logs')
      .update({
        status: smsResult['response-code'] === 200 ? 'sent' : 'failed',
        api_response: JSON.stringify(result),
        message_id: smsResult.messageid?.toString(),
        network_id: smsResult.networkid,
        response_code: smsResult['response-code'],
        sent_at: new Date().toISOString()
      })
      .eq('id', logData.id)

    return new Response(
      JSON.stringify({
        success: smsResult['response-code'] === 200,
        logId: logData.id,
        error: smsResult['response-code'] !== 200 ? smsResult['response-description'] : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        logId: '', 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})