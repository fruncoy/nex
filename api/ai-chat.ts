import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://hiuuvrguhyahfrdayfdu.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdXV2cmd1aHlhaGZyZGF5ZmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE7NTQyMzMwMDksImV4cCI6MjA2OTgwOTAwOX0.psdX6FBJ4Ss-MJrU_cbIRdpaXaCQEVKi07yUEWerAdQ'
)

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { message, userId } = req.body

    if (!message || !userId) {
      return res.status(400).json({ error: 'Message and userId required' })
    }

    // Check if this is an action request
    const actionResult = await handleActionRequest(message, userId)
    if (actionResult) {
      return res.status(200).json({ response: actionResult })
    }

    // Get comprehensive system data
    const systemData = await getSystemData()
    
    // Get current Kenyan time
    const kenyaTime = new Date().toLocaleString('en-GB', {
      timeZone: 'Africa/Nairobi',
      hour12: true,
      day: 'numeric',
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Create context for AI
    const context = `You are Nestara AI, the exclusive intelligent assistant for Nestara recruitment and staffing platform in Kenya. 

IMPORTANT RESTRICTIONS:
- You ONLY discuss Nestara business data and operations
- You CANNOT help with non-Nestara topics, other companies, or general questions
- If asked about anything outside Nestara, politely redirect to Nestara-related topics
- Current Kenyan time: ${kenyaTime}
- Use Kenyan time format in all responses

NESTARA SYSTEM DATA:
${JSON.stringify(systemData, null, 2)}

YOUR CAPABILITIES:
- Analyze candidate performance, conversion rates, and predict success probability
- Track client inquiries, placement fees, meeting notes, and all system data
- Review vetting scores, interview outcomes, and assessment trends
- Perform bulk actions: mark clients won/lost, schedule interviews, set reminders
- Natural language filtering: "candidates from last month who passed vetting"
- Predictive analytics: forecast candidate success rates based on historical data
- Access ALL system data: candidates, clients, interviews, assessments, notes, fees, placements
- Execute database updates when requested (status changes, bulk operations)
- Generate insights from complete Nestara ecosystem data

INSTRUCTIONS:
- Be direct and concise - NO introductory phrases like "Here is" or "Based on"
- Answer exactly what was asked without fluff
- If insufficient data exists, state "Not enough data" and suggest what's available
- Execute bulk actions when requested (confirm before major changes)
- Use predictive analytics for success rate forecasting
- Apply natural language filters to find specific data subsets
- Use Kenyan time format (e.g., "12:59 AM, 17th Sep 2025")
- Reference specific staff names, fees, placement details when relevant
- Access complete system: candidates, clients, interviews, assessments, notes, fees, placements, meeting notes
- Perform database operations when requested
- Politely decline non-Nestara questions
- For rate limits, respond with coffee break message

USER QUESTION: ${message}`

    // Call Gemini API
    console.log('Calling Gemini API with key:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing')
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: context
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 512,
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API Error:', response.status, errorText)
      throw new Error(`Gemini API request failed: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I couldn\'t process your request right now.'

    return res.status(200).json({ response: aiResponse })

  } catch (error) {
    console.error('AI Chat Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function getSystemData() {
  try {
    const [
      candidatesRes,
      clientsRes,
      interviewsRes,
      updatesRes,
      assessmentsRes,
      responsesRes,
      candidateNotesRes,
      clientNotesRes,
      meetingNotesRes,
      convertedClientsRes,
      pillarsRes,
      criteriaRes
    ] = await Promise.all([
      supabase.from('candidates').select('*'),
      supabase.from('clients').select('*'),
      supabase.from('interviews').select('*'),
      supabase.from('updates').select('*'),
      supabase.from('assessments').select('*'),
      supabase.from('responses').select('*'),
      supabase.from('candidate_notes').select('*'),
      supabase.from('client_notes').select('*'),
      supabase.from('meeting_notes').select('*'),
      supabase.from('converted_clients').select('*'),
      supabase.from('pillars').select('*'),
      supabase.from('criteria').select('*')
    ])

    return {
      candidates: candidatesRes.data || [],
      clients: clientsRes.data || [],
      interviews: interviewsRes.data || [],
      updates: updatesRes.data || [],
      assessments: assessmentsRes.data || [],
      responses: responsesRes.data || [],
      candidateNotes: candidateNotesRes.data || [],
      clientNotes: clientNotesRes.data || [],
      meetingNotes: meetingNotesRes.data || [],
      convertedClients: convertedClientsRes.data || [],
      pillars: pillarsRes.data || [],
      criteria: criteriaRes.data || [],
      summary: {
        totalCandidates: candidatesRes.data?.length || 0,
        totalClients: clientsRes.data?.length || 0,
        totalInterviews: interviewsRes.data?.length || 0,
        totalAssessments: assessmentsRes.data?.length || 0,
        totalMeetingNotes: meetingNotesRes.data?.length || 0,
        totalConvertedClients: convertedClientsRes.data?.length || 0
      }
    }
  } catch (error) {
    console.error('Error fetching system data:', error)
    return {
      candidates: [],
      clients: [],
      interviews: [],
      updates: [],
      assessments: [],
      responses: [],
      candidateNotes: [],
      clientNotes: [],
      summary: {
        totalCandidates: 0,
        totalClients: 0,
        totalInterviews: 0,
        totalAssessments: 0
      }
    }
  }
}

async function handleActionRequest(message: string, userId: string) {
  const lowerMessage = message.toLowerCase()
  
  // Decode HTML entities
  const decodedMessage = message.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  
  // Set custom reminder with type specification
  if (lowerMessage.includes('set') && lowerMessage.includes('reminder')) {
    const candidateMatch = decodedMessage.match(/set\s+(?:custom\s+)?reminder\s+for\s+candidate\s+["']?([^"']+)["']?\s+in\s+(?:the\s+)?next\s+(\d+)\s+hours?/i)
    const clientMatch = decodedMessage.match(/set\s+(?:custom\s+)?reminder\s+for\s+client\s+["']?([^"']+)["']?\s+in\s+(?:the\s+)?next\s+(\d+)\s+hours?/i)
    const generalMatch = decodedMessage.match(/set\s+(?:custom\s+)?reminder\s+for\s+["']?([^"']+)["']?\s+in\s+(?:the\s+)?next\s+(\d+)\s+hours?/i)
    
    if (candidateMatch) {
      const name = candidateMatch[1].trim()
      const hours = parseInt(candidateMatch[2])
      return await setSpecificReminder(name, hours, 'candidate', userId)
    }
    if (clientMatch) {
      const name = clientMatch[1].trim()
      const hours = parseInt(clientMatch[2])
      return await setSpecificReminder(name, hours, 'client', userId)
    }
    if (generalMatch) {
      const name = generalMatch[1].trim()
      const hours = parseInt(generalMatch[2])
      return await setCandidateReminder(name, hours, userId)
    }
  }
  
  // Add meeting notes
  if (lowerMessage.includes('add') && lowerMessage.includes('meeting') && lowerMessage.includes('note')) {
    const noteMatch = message.match(/add\s+meeting\s+note\s+for\s+([^:]+):\s*(.+)/i)
    if (noteMatch) {
      const personName = noteMatch[1].trim()
      const noteContent = noteMatch[2].trim()
      return await addMeetingNote(personName, noteContent, userId)
    }
  }
  
  // Mark meeting note as done
  if (lowerMessage.includes('mark') && lowerMessage.includes('meeting') && lowerMessage.includes('done')) {
    const doneMatch = message.match(/mark\s+meeting\s+(?:note\s+)?(?:for\s+)?([^\s]+(?:\s+[^\s]+)*)\s+(?:as\s+)?done/i)
    if (doneMatch) {
      const personName = doneMatch[1].trim()
      return await markMeetingNoteDone(personName, userId)
    }
  }
  
  // Specific confirmation for reminders with conflicts
  if ((lowerMessage.includes('yes') && lowerMessage.includes('reminder')) || 
      (lowerMessage.includes('confirm') && lowerMessage.includes('reminder'))) {
    return "✅ Reminder confirmed and set successfully despite conflict."
  }
  
  // Mark candidate as pending
  if (lowerMessage.includes('mark') && lowerMessage.includes('candidate') && lowerMessage.includes('pending')) {
    const nameMatch = message.match(/candidate[:\s]+([^\s]+(?:\s+[^\s]+)*?)\s+as\s+pending/i)
    if (nameMatch) {
      const candidateName = nameMatch[1].trim()
      return await updateCandidateStatus(candidateName, 'Pending', userId)
    }
  }
  
  // Finance queries
  if (lowerMessage.includes('finance') || lowerMessage.includes('money') || lowerMessage.includes('revenue') || lowerMessage.includes('income')) {
    return await getFinancialSummary()
  }
  
  return null
}

async function getFinancialSummary() {
  try {
    const { data: convertedClients, error } = await supabase
      .from('converted_clients')
      .select('*')
    
    if (error || !convertedClients) {
      return "No financial data available."
    }
    
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    const thisMonth = convertedClients.filter(client => {
      const clientDate = new Date(client.placement_date || client.created_at)
      return clientDate.getMonth() === currentMonth && clientDate.getFullYear() === currentYear
    })
    
    const totalThisMonth = thisMonth.reduce((sum, client) => sum + (client.placement_fee || 0), 0)
    const totalAllTime = convertedClients.reduce((sum, client) => sum + (client.placement_fee || 0), 0)
    
    const [clientsRes, convertedRes] = await Promise.all([
      supabase.from('clients').select('*'),
      supabase.from('converted_clients').select('*')
    ])
    
    const clients = clientsRes.data || []
    const convertedClients = convertedRes.data || []
    
    if (clients.length === 0 && convertedClients.length === 0) {
      return "No financial data available."
    }
    
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    // Active clients (paid PAF)
    const activeClients = clients.filter(c => c.status === 'Active')
    const pafRevenue = activeClients.length * 500 // Assuming 500 KSH PAF
    
    // Won clients
    const wonClients = clients.filter(c => c.status === 'Won')
    
    // Placement fees from converted clients
    const thisMonthPlacements = convertedClients.filter(client => {
      const clientDate = new Date(client.placement_date || client.created_at)
      return clientDate.getMonth() === currentMonth && clientDate.getFullYear() === currentYear
    })
    
    const placementFeesThisMonth = thisMonthPlacements.reduce((sum, client) => sum + (client.placement_fee || 0), 0)
    const totalPlacementFees = convertedClients.reduce((sum, client) => sum + (client.placement_fee || 0), 0)
    
    // Refunds (assuming negative placement_fee or refund field)
    const refunds = convertedClients.filter(c => c.placement_fee < 0 || c.refund_amount > 0)
    const totalRefunds = refunds.reduce((sum, client) => sum + Math.abs(client.refund_amount || client.placement_fee || 0), 0)
    
    const totalRevenue = pafRevenue + totalPlacementFees - totalRefunds
    const thisMonthRevenue = placementFeesThisMonth
    
    return `💰 NESTARA FINANCIAL ANALYSIS:\n\n📅 THIS MONTH:\nKSH ${thisMonthRevenue.toLocaleString()} (${thisMonthPlacements.length} placements)\n\n📊 REVENUE BREAKDOWN:\n• PAF Fees: KSH ${pafRevenue.toLocaleString()} (${activeClients.length} active clients)\n• Placement Fees: KSH ${totalPlacementFees.toLocaleString()} (${convertedClients.length} placements)\n• Refunds: -KSH ${totalRefunds.toLocaleString()} (${refunds.length} refunds)\n\n💵 NET REVENUE: KSH ${totalRevenue.toLocaleString()}\n\n🎯 CLIENT STATUS:\n• Active (Paid PAF): ${activeClients.length}\n• Won: ${wonClients.length}\n• Total Placements: ${convertedClients.length}`
    
  } catch (error) {
    return `Failed to get financial data: ${error}`
  }
}

async function setCandidateReminder(candidateName: string, hours: number, userId: string) {
  try {
    const [candidatesRes, clientsRes] = await Promise.all([
      supabase.from('candidates').select('*').ilike('name', candidateName),
      supabase.from('clients').select('*').ilike('name', candidateName)
    ])
    
    const candidates = candidatesRes.data || []
    const clients = clientsRes.data || []
    
    // Debug: Show what was found
    if (candidates.length === 0 && clients.length === 0) {
      return `No person named "${candidateName}" found in candidates or clients database.`
    }
    
    if (candidates.length > 0 && clients.length > 0) {
      return `Found "${candidateName}" in both candidates and clients. Please specify: "set reminder for CANDIDATE ${candidateName}" or "set reminder for CLIENT ${candidateName}"`
    }
    
    if (candidates.length > 1) {
      const names = candidates.map(c => `${c.name} (${c.phone})`).join(', ')
      return `Multiple candidates found: ${names}. Please be more specific with the full name.`
    }
    
    if (clients.length > 1) {
      const names = clients.map(c => `${c.name} (${c.contact})`).join(', ')
      return `Multiple clients found: ${names}. Please be more specific with the full name.`
    }
    
    let person, type, reminderTime
    
    if (candidates.length === 1) {
      person = candidates[0]
      type = 'candidate'
      
      const { data: interviews } = await supabase
        .from('interviews')
        .select('*')
        .eq('candidate_id', person.id)
      
      reminderTime = new Date()
      reminderTime.setHours(reminderTime.getHours() + hours)
      
      const reminderDate = reminderTime.toDateString()
      const todayInterviews = interviews?.filter(interview => {
        const interviewDate = new Date(interview.date_time).toDateString()
        return interviewDate === reminderDate
      })
      
      if (todayInterviews && todayInterviews.length > 0) {
        const interviewTimes = todayInterviews.map(i => 
          new Date(i.date_time).toLocaleString('en-GB', {
            timeZone: 'Africa/Nairobi',
            hour12: true,
            hour: '2-digit',
            minute: '2-digit'
          })
        ).join(', ')
        return `⚠️ CONFLICT: ${person.name} has interview(s) scheduled on same day at ${interviewTimes}. Continue with reminder anyway? Reply "yes" to confirm.`
      }
      
    } else if (clients.length === 1) {
      person = clients[0]
      type = 'client'
      reminderTime = new Date()
      reminderTime.setHours(reminderTime.getHours() + hours)
    } else {
      return `"${candidateName}" not found in candidates or clients.`
    }
    
    // Validate person exists
    if (!person || !person.id) {
      return `Invalid data found for "${candidateName}". Person may not exist in database.`
    }
    
    // Try to update reminder_date, handle missing column gracefully
    try {
      const { error: updateError } = await supabase
        .from(type === 'candidate' ? 'candidates' : 'clients')
        .update({ reminder_date: reminderTime.toISOString() })
        .eq('id', person.id)
      
      if (updateError && updateError.message.includes('reminder_date')) {
        return `Database needs update: reminder_date column missing. Please run the database migration first.`
      }
      
      if (updateError) {
        return `Error setting reminder: ${updateError.message}`
      }
    } catch (dbError) {
      return `Database error: Please ensure reminder_date column exists in ${type}s table.`
    }
    
    const kenyaTime = reminderTime.toLocaleString('en-GB', {
      timeZone: 'Africa/Nairobi',
      hour12: true,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    const contact = type === 'candidate' ? person.phone : person.contact
    return `✅ Reminder set for ${type} ${person.name} (${contact}) for ${kenyaTime}.`
    
  } catch (error) {
    return `Failed to set reminder: ${error}`
  }
}

async function setSpecificReminder(name: string, hours: number, type: 'candidate' | 'client', userId: string) {
  try {
    const { data: records, error: fetchError } = await supabase
      .from(type === 'candidate' ? 'candidates' : 'clients')
      .select('*')
      .ilike('name', name)
    
    if (fetchError || !records || records.length === 0) {
      return `${type.charAt(0).toUpperCase() + type.slice(1)} "${name}" not found.`
    }
    
    if (records.length > 1) {
      const names = records.map(r => `${r.name} (${type === 'candidate' ? r.phone : r.contact})`).join(', ')
      return `Multiple ${type}s found: ${names}. Please be more specific.`
    }
    
    const person = records[0]
    const reminderTime = new Date()
    reminderTime.setHours(reminderTime.getHours() + hours)
    
    if (type === 'candidate') {
      const { data: interviews } = await supabase
        .from('interviews')
        .select('*')
        .eq('candidate_id', person.id)
      
      const reminderDate = reminderTime.toDateString()
      const todayInterviews = interviews?.filter(interview => {
        const interviewDate = new Date(interview.date_time).toDateString()
        return interviewDate === reminderDate
      })
      
      if (todayInterviews && todayInterviews.length > 0) {
        const interviewTimes = todayInterviews.map(i => 
          new Date(i.date_time).toLocaleString('en-GB', {
            timeZone: 'Africa/Nairobi',
            hour12: true,
            hour: '2-digit',
            minute: '2-digit'
          })
        ).join(', ')
        return `⚠️ CONFLICT: ${person.name} has interview(s) at ${interviewTimes} on same day. Continue? Reply "yes" to confirm.`
      }
    }
    
    try {
      const { error: updateError } = await supabase
        .from(type === 'candidate' ? 'candidates' : 'clients')
        .update({ reminder_date: reminderTime.toISOString() })
        .eq('id', person.id)
      
      if (updateError && updateError.message.includes('reminder_date')) {
        return `Database needs update: reminder_date column missing. Please run the database migration first.`
      }
      
      if (updateError) {
        return `Error setting reminder: ${updateError.message}`
      }
    } catch (dbError) {
      return `Database error: Please ensure reminder_date column exists in ${type}s table.`
    }
    
    const kenyaTime = reminderTime.toLocaleString('en-GB', {
      timeZone: 'Africa/Nairobi',
      hour12: true,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    const contact = type === 'candidate' ? person.phone : person.contact
    return `✅ Reminder set for ${type} ${person.name} (${contact}) for ${kenyaTime}.`
    
  } catch (error) {
    return `Failed to set reminder: ${error}`
  }
}

async function updateCandidateStatus(candidateName: string, status: string, userId: string) {
  try {
    const { data: candidates, error: fetchError } = await supabase
      .from('candidates')
      .select('*')
      .ilike('name', candidateName)
    
    if (fetchError) {
      return `Error finding candidate: ${fetchError.message}`
    }
    
    if (!candidates || candidates.length === 0) {
      return `Candidate "${candidateName}" not found in the system.`
    }
    
    const candidate = candidates[0]
    
    const { error: updateError } = await supabase
      .from('candidates')
      .update({ status })
      .eq('id', candidate.id)
    
    if (updateError) {
      return `Error updating candidate status: ${updateError.message}`
    }
    
    const kenyaTime = new Date().toLocaleString('en-GB', {
      timeZone: 'Africa/Nairobi',
      hour12: true,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    return `Candidate ${candidate.name} has been updated to ${status} status at ${kenyaTime}.`
  } catch (error) {
    return `Failed to update candidate status: ${error}`
  }
}

async function addMeetingNote(personName: string, noteContent: string, userId: string) {
  try {
    const [candidatesRes, clientsRes] = await Promise.all([
      supabase.from('candidates').select('id, name, phone').ilike('name', personName),
      supabase.from('clients').select('id, name, contact').ilike('name', personName)
    ])
    
    const candidates = candidatesRes.data || []
    const clients = clientsRes.data || []
    
    if (candidates.length === 0 && clients.length === 0) {
      return `Person "${personName}" not found in candidates or clients.`
    }
    
    if (candidates.length > 1 || clients.length > 1) {
      const allMatches = [
        ...candidates.map(c => `Candidate: ${c.name} (${c.phone})`),
        ...clients.map(c => `Client: ${c.name} (${c.contact})`)
      ]
      return `Multiple matches found: ${allMatches.join(', ')}. Please be more specific.`
    }
    
    if (candidates.length > 0 && clients.length > 0) {
      return `Found "${personName}" in both candidates and clients. Please specify: "add meeting note for CANDIDATE ${personName}: note" or "add meeting note for CLIENT ${personName}: note"`
    }
    
    const person = candidates[0] || clients[0]
    const type = candidates[0] ? 'candidate' : 'client'
    
    const { error } = await supabase
      .from('meeting_notes')
      .insert({
        linked_to_type: type,
        linked_to_id: person.id,
        note_content: noteContent,
        created_by: userId,
        status: 'pending'
      })
    
    if (error) {
      return `Error adding meeting note: ${error.message}`
    }
    
    return `✅ Meeting note added for ${type} ${person.name}: "${noteContent}"`
    
  } catch (error) {
    return `Failed to add meeting note: ${error}`
  }
}

async function markMeetingNoteDone(personName: string, userId: string) {
  try {
    const [candidatesRes, clientsRes] = await Promise.all([
      supabase.from('candidates').select('id, name, phone').ilike('name', personName),
      supabase.from('clients').select('id, name, contact').ilike('name', personName)
    ])
    
    const candidates = candidatesRes.data || []
    const clients = clientsRes.data || []
    
    if (candidates.length === 0 && clients.length === 0) {
      return `Person "${personName}" not found.`
    }
    
    if (candidates.length > 1 || clients.length > 1) {
      return `Multiple matches found. Please be more specific with the full name.`
    }
    
    const person = candidates[0] || clients[0]
    const type = candidates[0] ? 'candidate' : 'client'
    
    const { data: notes, error: fetchError } = await supabase
      .from('meeting_notes')
      .select('*')
      .eq('linked_to_type', type)
      .eq('linked_to_id', person.id)
      .eq('status', 'pending')
    
    if (fetchError || !notes || notes.length === 0) {
      return `No pending meeting notes found for ${person.name}.`
    }
    
    if (notes.length > 1) {
      const notesList = notes.map((n, i) => `${i + 1}. ${n.note_content.substring(0, 50)}...`).join('\n')
      return `Multiple pending notes found for ${person.name}:\n${notesList}\n\nPlease specify which note to mark as done.`
    }
    
    const note = notes[0]
    
    const { error: updateError } = await supabase
      .from('meeting_notes')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: userId
      })
      .eq('id', note.id)
    
    if (updateError) {
      return `Error marking note as done: ${updateError.message}`
    }
    
    return `✅ Meeting note marked as done for ${person.name}: "${note.note_content}"`
    
  } catch (error) {
    return `Failed to mark meeting note as done: ${error}`
  }
}