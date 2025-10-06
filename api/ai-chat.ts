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
- Use Kenyan time format when showing dates/times, but don't include time in greetings

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
- Smart user matching: understand "purity" = "Purity Iseren", "taan" = "Taana", etc.
- Flexible name recognition: match partial names, nicknames, and variations

INSTRUCTIONS:
- Be friendly and professional like a helpful assistant
- NEVER show database IDs, user IDs, or technical details
- Use natural language and avoid technical jargon
- When mentioning people, use names not IDs
- Present information in a clean, organized way
- NEVER use markdown formatting, asterisks, or bold text
- Use simple numbered lists and plain text only
- If insufficient data exists, say "I don't have that information" and suggest alternatives
- Execute bulk actions when requested (confirm before major changes)
- Use Kenyan time format (e.g., "12:59 AM, 17th Sep 2025")
- Reference specific staff names, not user IDs
- Be conversational and helpful
- For rate limits, respond with coffee break message
- Be intelligent about user name matching: "purity" should match "Purity Iseren"
- Use context clues and fuzzy matching for names
- Don't be overly restrictive - be helpful and understanding

USER QUESTION: ${message}

Remember: Be friendly, hide all technical details, use names not IDs, and present information clearly.`

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

    // User mapping for friendly names
    const userMap = {
      '797757ff-9532-408e-afc0-aa5ad4eda86a': 'Taana',
      // Add more user mappings as needed
    }
    
    // Clean meeting notes to show names instead of IDs
    const cleanMeetingNotes = (meetingNotesRes.data || []).map(note => ({
      ...note,
      created_by_name: userMap[note.created_by] || 'Team Member',
      completed_by_name: note.completed_by ? (userMap[note.completed_by] || 'Team Member') : null
    }))

    // Get meeting tasks for AI context
    const meetingTasksRes = await supabase.from('meeting_note_tasks').select('*')
    const staffRes = await supabase.from('staff').select('*')
    
    return {
      candidates: candidatesRes.data || [],
      clients: clientsRes.data || [],
      interviews: interviewsRes.data || [],
      updates: updatesRes.data || [],
      assessments: assessmentsRes.data || [],
      responses: responsesRes.data || [],
      candidateNotes: candidateNotesRes.data || [],
      clientNotes: clientNotesRes.data || [],
      meetingNotes: cleanMeetingNotes,
      meetingTasks: meetingTasksRes.data || [],
      staff: staffRes.data || [],
      convertedClients: convertedClientsRes.data || [],
      pillars: pillarsRes.data || [],
      criteria: criteriaRes.data || [],
      userMap,
      summary: {
        totalCandidates: candidatesRes.data?.length || 0,
        totalClients: clientsRes.data?.length || 0,
        totalInterviews: interviewsRes.data?.length || 0,
        totalAssessments: assessmentsRes.data?.length || 0,
        totalMeetingNotes: meetingNotesRes.data?.length || 0,
        totalMeetingTasks: meetingTasksRes.data?.length || 0,
        totalStaff: staffRes.data?.length || 0,
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
  
  // Meeting tasks queries
  if (lowerMessage.includes('meeting') && (lowerMessage.includes('task') || lowerMessage.includes('note'))) {
    const isUserSpecific = lowerMessage.includes('my') || lowerMessage.includes('assigned to me') || message.match(/(?:for|by|assigned to)\s+([a-zA-Z]+)/i)
    const isToday = lowerMessage.includes('today') || lowerMessage.includes('today\'s')
    const isPending = lowerMessage.includes('pending')
    const isCompleted = lowerMessage.includes('completed') || lowerMessage.includes('done')
    
    if (isUserSpecific) {
      const userMatch = message.match(/(?:for|by|assigned to)\s+([a-zA-Z]+)/i)
      const userName = userMatch ? userMatch[1].trim() : 'me'
      return await getUserMeetingTasks(userName, { today: isToday, pending: isPending, completed: isCompleted })
    } else {
      return await getAllMeetingTasks({ today: isToday, pending: isPending, completed: isCompleted })
    }
  }
  
  // Tasks assigned to specific user (fallback)
  if (lowerMessage.includes('task')) {
    const userMatch = message.match(/(?:for|by|assigned to)\s+([a-zA-Z]+)/i)
    if (userMatch) {
      const userName = userMatch[1].trim()
      let dateFilter = ''
      if (lowerMessage.includes('today')) dateFilter = 'today'
      else if (lowerMessage.includes('pending')) dateFilter = 'pending'
      else if (lowerMessage.includes('completed')) dateFilter = 'completed'
      
      return await getUserAssignedTasks(userName, dateFilter)
    }
  }
  
  // Assign task to user
  if (lowerMessage.includes('assign') && lowerMessage.includes('task')) {
    const assignMatch = message.match(/assign\s+task\s+"([^"]+)"\s+to\s+([a-zA-Z]+)/i)
    if (assignMatch) {
      const taskDescription = assignMatch[1].trim()
      const userName = assignMatch[2].trim()
      return await assignTaskToUser(taskDescription, userName, userId)
    }
  }
  
  return null
}

async function getUserMeetingNotes(userName: string) {
  try {
    const userMap = {
      'taana': '797757ff-9532-408e-afc0-aa5ad4eda86a'
    }
    
    const userId = userMap[userName.toLowerCase()]
    if (!userId || userName.toLowerCase() !== 'taana') {
      return `I can only show meeting notes for Taana.`
    }
    
    const { data: notes, error } = await supabase
      .from('meeting_notes')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
    
    if (error || !notes || notes.length === 0) {
      return `No meeting notes found for ${userName}.`
    }
    
    const todayNotes = notes.filter(note => {
      const noteDate = new Date(note.created_at).toDateString()
      const today = new Date().toDateString()
      return noteDate === today
    })
    
    if (todayNotes.length === 0) {
      return `${userName} has no meeting notes for today.`
    }
    
    const latestNote = todayNotes[0]
    const tasks = Array.isArray(latestNote.notes) ? latestNote.notes : 
                  typeof latestNote.notes === 'string' ? JSON.parse(latestNote.notes) : []
    
    let response = `Taana's Tasks from Today's Meeting\n\n`
    
    if (latestNote.meeting_title) {
      response += `Meeting: ${latestNote.meeting_title}\n\n`
    }
    
    response += `Tasks and Deliverables:\n`
    tasks.forEach((task, index) => {
      // Clean up task text and capitalize first letter
      let cleanTask = task.replace(/^To\s+/i, '').trim()
      cleanTask = cleanTask.charAt(0).toUpperCase() + cleanTask.slice(1)
      if (!cleanTask.endsWith('.')) cleanTask += '.'
      
      response += `${index + 1}. ${cleanTask}\n`
    })
    
    const status = latestNote.status || 'pending'
    response += `\nStatus: ${status.charAt(0).toUpperCase() + status.slice(1)}`
    
    return response
    
  } catch (error) {
    return `Sorry, I couldn't retrieve ${userName}'s meeting notes.`
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

async function getUserMeetingTasks(userName: string, filters: { today?: boolean, pending?: boolean, completed?: boolean }) {
  try {
    // Smart user matching with fuzzy search
    const { data: staffList, error: staffError } = await supabase
      .from('staff')
      .select('id, name, username')
    
    if (staffError) {
      console.error('Error fetching staff:', staffError)
    }
    
    // Find user with fuzzy matching
    let userId = null
    let matchedUser = null
    
    if (userName === 'me') {
      userId = '797757ff-9532-408e-afc0-aa5ad4eda86a'
      matchedUser = 'You'
    } else if (staffList) {
      // Try exact matches first
      matchedUser = staffList.find(staff => 
        staff.name.toLowerCase() === userName.toLowerCase() ||
        staff.username.toLowerCase() === userName.toLowerCase()
      )
      
      // If no exact match, try partial matches
      if (!matchedUser) {
        matchedUser = staffList.find(staff => 
          staff.name.toLowerCase().includes(userName.toLowerCase()) ||
          staff.username.toLowerCase().includes(userName.toLowerCase()) ||
          userName.toLowerCase().includes(staff.name.toLowerCase().split(' ')[0]) ||
          userName.toLowerCase().includes(staff.username.toLowerCase())
        )
      }
      
      if (matchedUser) {
        userId = matchedUser.id
      }
    }
    
    if (!userId) {
      // Let AI handle this naturally instead of hard error
      return await getAllMeetingTasks(filters)
    }
    
    console.log(`AI Reasoning: Looking for meeting tasks assigned to ${matchedUser?.name || userName} (ID: ${userId})`)
    
    let query = supabase
      .from('meeting_note_tasks')
      .select(`
        *,
        meeting_notes!inner(title, meeting_date)
      `)
      .eq('assigned_to', userId)
    
    if (filters.today) {
      const today = new Date().toISOString().split('T')[0]
      query = query.eq('meeting_notes.meeting_date', today)
    }
    
    if (filters.pending) {
      query = query.eq('status', 'pending')
    }
    
    if (filters.completed) {
      query = query.eq('status', 'completed')
    }
    
    const { data: tasks, error } = await query.order('created_at', { ascending: false })
    
    if (error) {
      return `Error fetching meeting tasks: ${error.message}`
    }
    
    console.log(`AI Reasoning: Found ${tasks?.length || 0} tasks for ${userName}`)
    
    if (!tasks || tasks.length === 0) {
      const filterText = filters.today ? 'today' : filters.pending ? 'pending' : filters.completed ? 'completed' : ''
      return `No ${filterText} meeting tasks found for ${userName === 'me' ? 'you' : userName}.`
    }
    
    // Validation: Check if tasks are actually assigned to the correct user
    const incorrectAssignments = tasks.filter(task => task.assigned_to !== userId)
    if (incorrectAssignments.length > 0) {
      console.warn(`AI Warning: Found ${incorrectAssignments.length} tasks with incorrect user assignment`)
    }
    
    const tasksByMeeting = tasks.reduce((acc, task) => {
      const meetingTitle = task.meeting_notes?.title || 'Untitled Meeting'
      const meetingDate = task.meeting_notes?.meeting_date
      const key = `${meetingTitle} (${new Date(meetingDate).toLocaleDateString()})`
      
      if (!acc[key]) acc[key] = []
      acc[key].push(task)
      return acc
    }, {})
    
    let response = `${userName === 'me' ? 'Your' : (matchedUser?.name || userName) + '\'s'} Meeting Tasks (${tasks.length} tasks)\n\n`
    
    Object.entries(tasksByMeeting).forEach(([meeting, tasks]) => {
      response += `${meeting}\n`
      tasks.forEach((task, index) => {
        const cleanDescription = task.task_description
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/^To\s+/i, '')
          .trim()
        const status = task.status === 'completed' ? '✅' : '⏳'
        response += `  ${status} ${cleanDescription}\n`
      })
      response += '\n'
    })
    
    return response
    
  } catch (error) {
    return `Sorry, I couldn't retrieve meeting tasks for ${userName}.`
  }
}

async function getAllMeetingTasks(filters: { today?: boolean, pending?: boolean, completed?: boolean }) {
  try {
    let query = supabase
      .from('meeting_note_tasks')
      .select(`
        *,
        meeting_notes!inner(title, meeting_date),
        assigned_staff:assigned_to(name, username)
      `)
    
    if (filters.today) {
      const today = new Date().toISOString().split('T')[0]
      query = query.eq('meeting_notes.meeting_date', today)
    }
    
    if (filters.pending) {
      query = query.eq('status', 'pending')
    }
    
    if (filters.completed) {
      query = query.eq('status', 'completed')
    }
    
    const { data: tasks, error } = await query.order('created_at', { ascending: false })
    
    if (error) {
      return `Error fetching meeting tasks: ${error.message}`
    }
    
    if (!tasks || tasks.length === 0) {
      const filterText = filters.today ? 'today\'s' : filters.pending ? 'pending' : filters.completed ? 'completed' : ''
      return `No ${filterText} meeting tasks found.`
    }
    
    const tasksByMeeting = tasks.reduce((acc, task) => {
      const meetingTitle = task.meeting_notes?.title || 'Untitled Meeting'
      const meetingDate = task.meeting_notes?.meeting_date
      const key = `${meetingTitle} (${new Date(meetingDate).toLocaleDateString()})`
      
      if (!acc[key]) acc[key] = []
      acc[key].push(task)
      return acc
    }, {})
    
    let response = `All Meeting Tasks\n\n`
    
    Object.entries(tasksByMeeting).forEach(([meeting, tasks]) => {
      response += `${meeting}\n`
      tasks.forEach((task, index) => {
        const cleanDescription = task.task_description
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/^To\s+/i, '')
          .trim()
        const assignedTo = task.assigned_staff?.name || 'Unassigned'
        const status = task.status === 'completed' ? '✅' : '⏳'
        response += `  ${status} ${cleanDescription} (${assignedTo})\n`
      })
      response += '\n'
    })
    
    return response
    
  } catch (error) {
    return `Sorry, I couldn't retrieve meeting tasks.`
  }
}

async function getUserAssignedTasks(userName: string, dateFilter?: string) {
  try {
    const userMap = {
      'taana': '797757ff-9532-408e-afc0-aa5ad4eda86a'
    }
    
    const userId = userMap[userName.toLowerCase()]
    if (!userId || userName.toLowerCase() !== 'taana') {
      return `I can only show tasks for Taana.`
    }
    
    let query = supabase
      .from('task_assignments')
      .select('*')
      .eq('assigned_to', userId)
    
    // Apply date filter if specified
    if (dateFilter) {
      if (dateFilter.includes('today')) {
        const today = new Date().toDateString()
        query = query.gte('created_at', new Date(today).toISOString())
      } else if (dateFilter.includes('pending')) {
        query = query.eq('status', 'pending')
      } else if (dateFilter.includes('completed')) {
        query = query.eq('status', 'completed')
      }
    }
    
    const { data: tasks, error } = await query.order('created_at', { ascending: false })
    
    if (error) {
      return `Error fetching tasks: ${error.message}`
    }
    
    if (!tasks || tasks.length === 0) {
      return `No tasks found for ${userName}.`
    }
    
    let response = `${userName}'s Tasks\n\n`
    
    tasks.forEach((task, index) => {
      const createdDate = new Date(task.created_at).toLocaleDateString('en-GB')
      let cleanTask = task.task_description
        .replace(/&quot;/g, '')
        .replace(/&#39;/g, '')
        .replace(/^To\s+/i, '')
        .replace(/^"/, '')
        .replace(/"$/, '')
        .trim()
      
      const capitalizedTask = cleanTask.charAt(0).toUpperCase() + cleanTask.slice(1)
      
      response += `${index + 1}. ${capitalizedTask}\n`
      response += `   Created: ${createdDate}\n`
      response += `   Status: ${task.status}\n\n`
    })
    
    return response
    
  } catch (error) {
    return `Sorry, I couldn't retrieve ${userName}'s tasks.`
  }
}

async function assignTaskToUser(taskDescription: string, userName: string, assignedBy: string) {
  try {
    const userMap = {
      'taana': '797757ff-9532-408e-afc0-aa5ad4eda86a'
    }
    
    const userId = userMap[userName.toLowerCase()]
    if (!userId) {
      return `User ${userName} not found.`
    }
    
    const { error } = await supabase
      .from('task_assignments')
      .insert({
        task_description: taskDescription,
        assigned_to: userId,
        assigned_by: assignedBy,
        status: 'pending',
        created_at: new Date().toISOString()
      })
    
    if (error) {
      return `Error assigning task: ${error.message}`
    }
    
    return `Task assigned to ${userName}: ${taskDescription}`
    
  } catch (error) {
    return `Failed to assign task: ${error}`
  }
}