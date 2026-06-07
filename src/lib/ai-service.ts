import { supabase } from './supabase'

// Nesta's identity in the system (System AI Profile)
const AI_STAFF_ID = '00000000-0000-0000-0000-000000000000'

interface SystemData {
  candidates: any[]
  clients: any[]
  interviews: any[]
  assessments: any[]
  meetingNotes: any[]
  meetingTasks: any[]
  staff: any[]
  convertedClients: any[]
  niche: {
    candidates: any[]
    training: any[]
    courses: any[]
    fees: any[]
    payments: any[]
    grades: any[]
  }
  summary: {
    totalCandidates: number
    totalClients: number
    totalInterviews: number
    totalNicheCandidates: number
    totalNicheTrainees: number
    totalStaff: number
    successRate: string
    averageVettingScore: number
  }
}

export async function sendAIMessage(message: string, userId: string): Promise<string> {
  const lowerMessage = message.toLowerCase().trim()
  
  // 1. ROBUST GREETING & SIMPLE CHECK (Zero API Cost)
  const isGreeting = /^(hi|hello|jambo|hey|habari|nesta|nex|morning|evening|afternoon|yo|greeting)/i.test(lowerMessage)
  if (isGreeting && lowerMessage.split(' ').length <= 3) {
    return `Jambo! I am Nesta (NEX), your Intelligence System. I am ready to analyze Nestara's data and execute your commands. How can I help you today?`
  }

  try {
    // 2. Try to handle as an action request using Nesta's identity
    const actionResult = await handleActionRequest(message, AI_STAFF_ID)
    if (actionResult) {
      return actionResult
    }

    // 3. Get full system data for intelligent context (Optimized)
    const systemData = await getSystemData()

    // 4. Get current Kenyan time
    const kenyaTime = new Date().toLocaleString('en-GB', {
      timeZone: 'Africa/Nairobi',
      hour12: true,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // 5. Build the system prompt for Nesta AI (NLP context - Compressed)
    const systemPrompt = `You are **NESTA** (NEX) - Nestara's Intelligence System.

IDENTITY: Senior Intelligence Officer with FULL system access. Direct, proactive.
PHILOSOPHY: ANALYZE, PREDICT, and RECOMMEND. Solve problems.

SNAPSHOT:
Time: ${kenyaTime}
Pipeline: ${systemData.summary.totalCandidates} | Success: ${systemData.summary.successRate}
Active Trainees: ${systemData.summary.totalNicheTrainees} | Avg Score: ${systemData.summary.averageVettingScore}

LATEST DATA:
CANDIDATES: ${JSON.stringify(systemData.candidates.slice(0, 10).map(c => ({ n: c.name, r: c.role, s: c.status, sc: c.vetting_score })))}
TRAINEES: ${JSON.stringify(systemData.niche.training.slice(0, 10).map(t => ({ n: t.name, c: t.course, s: t.status })))}
FEES: ${JSON.stringify(systemData.niche.fees.slice(0, 5).map(f => ({ t: f.trainee_name, b: f.balance })))}

RULES:
- NO IDs/UUIDs.
- Kenyan time: "12:59 AM, 17th Sep 2025"
- Plain text only. NO markdown/bold.
- Use numbered lists.

USER: ${message}`

    // 6. Call Gemini 2.0 Flash (Primary)
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': geminiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
        })
      })

      if (response.ok) {
        const data = await response.json()
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I processed the request but have no insight to share.'
      }
      
      if (response.status === 429) {
        return 'Nesta is currently processing a lot of data. Please wait about 30 seconds for my circuits to cool down! ☕'
      }
    } catch (e) {
      console.error('Gemini call failed', e)
    }

    return 'I encountered a brief sync issue. Please try again.'

  } catch (error) {
    console.error('Nesta AI Service Error:', error)
    return 'System intelligence is currently calibrating. Please try again in a moment.'
  }
}


async function callOpenAIFallback(prompt: string): Promise<string> {
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
  const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      })
    })

    if (!response.ok) throw new Error('OpenAI Fallback Failed')
    const data = await response.json()
    return data.choices[0]?.message?.content || 'Fallback intelligence failed to generate response.'
  } catch (error) {
    return 'Both primary and secondary intelligence systems are currently at capacity. Please try again in 30 seconds.'
  }
}

async function getSystemData(): Promise<SystemData> {
  try {
    const [
      candidatesRes,
      clientsRes,
      interviewsRes,
      assessmentsRes,
      meetingNotesRes,
      meetingTasksRes,
      staffRes,
      convertedClientsRes,
      nicheCandidatesRes,
      nicheTrainingRes,
      nicheCoursesRes,
      nicheFeesRes,
      nichePaymentsRes,
      nicheGradesRes
    ] = await Promise.all([
      supabase.from('candidates').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('interviews').select('*').order('date_time', { ascending: false }),
      supabase.from('assessments').select('*'),
      supabase.from('meeting_notes').select('*').order('created_at', { ascending: false }),
      supabase.from('meeting_note_tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('staff').select('*').order('name'),
      supabase.from('converted_clients').select('*'),
      supabase.from('niche_candidates').select('*').order('created_at', { ascending: false }),
      supabase.from('niche_training').select('*').order('created_at', { ascending: false }),
      supabase.from('niche_courses').select('*').eq('is_active', true),
      supabase.from('niche_fees').select('*'),
      supabase.from('niche_payments').select('*'),
      supabase.from('trainee_grades').select('*')
    ])

    const candidates = candidatesRes.data || []
    const totalCandidates = candidates.length
    const wonCandidates = candidates.filter(c => c.status === 'WON' || c.status === 'WON - Interview Won').length
    const successRate = totalCandidates > 0 ? ((wonCandidates / totalCandidates) * 100).toFixed(1) + '%' : '0%'
    
    const validScores = candidates.filter(c => c.vetting_score > 0).map(c => c.vetting_score)
    const avgVettingScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0

    const userMap: Record<string, string> = {
      '00000000-0000-0000-0000-000000000000': 'Nesta',
      '797757ff-9532-408e-afc0-aa5ad4eda86a': 'Frank',
      '23b322f0-38ef-4f48-815c-a7771dce42ab': 'Taana',
      '6e9d3f52-2850-494e-868a-f4ffe3d4893e': 'Leon',
      '8180624a-75cc-4458-800f-9cbf3b777cfc': 'Ivy',
      '56794a5b-d298-4053-aba5-8f16338f30f1': 'Steven',
      '80dd8af7-9492-4349-9fed-f21f4327f612': 'Liduine',
      '3e6fb44f-d254-4f97-a509-ef121ebfb352': 'Monica',
      'e06bc50c-b85b-427b-8d00-9fdd2a3e8b32': 'Purity',
      '8f46c155-893c-4e54-96ea-57be561ef792': 'LM'
    }

    const cleanMeetingNotes = (meetingNotesRes.data || []).map((note: any) => ({
      ...note,
      created_by_name: userMap[note.created_by] || 'Team Member'
    }))

    return {
      candidates: candidates,
      clients: clientsRes.data || [],
      interviews: interviewsRes.data || [],
      assessments: assessmentsRes.data || [],
      meetingNotes: cleanMeetingNotes,
      meetingTasks: meetingTasksRes.data || [],
      staff: staffRes.data || [],
      convertedClients: convertedClientsRes.data || [],
      niche: {
        candidates: nicheCandidatesRes.data || [],
        training: nicheTrainingRes.data || [],
        courses: nicheCoursesRes.data || [],
        fees: nicheFeesRes.data || [],
        payments: nichePaymentsRes.data || [],
        grades: nicheGradesRes.data || []
      },
      summary: {
        totalCandidates,
        totalClients: clientsRes.data?.length || 0,
        totalInterviews: interviewsRes.data?.length || 0,
        totalNicheCandidates: nicheCandidatesRes.data?.length || 0,
        totalNicheTrainees: nicheTrainingRes.data?.length || 0,
        totalStaff: staffRes.data?.length || 0,
        successRate,
        averageVettingScore: avgVettingScore
      }
    }
  } catch (error) {
    console.error('Error fetching system data:', error)
    return {
      candidates: [], clients: [], interviews: [], assessments: [], meetingNotes: [], meetingTasks: [], staff: [], convertedClients: [],
      niche: { candidates: [], training: [], courses: [], fees: [], payments: [], grades: [] },
      summary: { totalCandidates: 0, totalClients: 0, totalInterviews: 0, totalNicheCandidates: 0, totalNicheTrainees: 0, totalStaff: 0, successRate: '0%', averageVettingScore: 0 }
    }
  }
}

// ACTION HANDLERS - Execute real operations via natural language matching

async function handleActionRequest(message: string, userId: string): Promise<string | null> {
  const lowerMessage = message.toLowerCase()

  // 1. Add Niche Candidate
  if (lowerMessage.includes('add') && lowerMessage.includes('candidate')) {
    const match = message.match(/add\s+candidate\s+([a-zA-Z\s]+),?\s*phone\s+([0-9+\s]+),?\s*role\s+([a-zA-Z\s]+)/i)
    if (match) {
      return await addCandidate(match[1].trim(), match[2].trim(), match[3].trim(), userId)
    }
  }

  // 2. Add Niche Trainee
  if (lowerMessage.includes('add') && lowerMessage.includes('trainee')) {
    const match = message.match(/add\s+trainee\s+([a-zA-Z\s]+),?\s*phone\s+([0-9+\s]+),?\s*course\s+([a-zA-Z\s&]+)/i)
    if (match) {
      return await addTrainee(match[1].trim(), match[2].trim(), match[3].trim(), userId)
    }
  }

  // 3. Search System (Universal)
  if (lowerMessage.includes('find') || lowerMessage.includes('search')) {
    const searchMatch = message.match(/(?:find|search)\s+(?:for\s+)?([a-zA-Z\s]+)/i)
    if (searchMatch) {
      return await universalSearch(searchMatch[1].trim())
    }
  }

  // 4. Update Candidate Status
  if (lowerMessage.includes('mark') && lowerMessage.includes('candidate') && lowerMessage.includes('as')) {
    const match = message.match(/mark\s+candidate\s+([a-zA-Z\s]+)\s+as\s+([a-zA-Z\s]+)/i)
    if (match) {
      return await updateCandidateStatus(match[1].trim(), match[2].trim(), userId)
    }
  }

  // 5. Bulk Operations
  if (lowerMessage.includes('bulk') || lowerMessage.includes('graduate all') || lowerMessage.includes('complete all')) {
    if (lowerMessage.includes('graduate')) return await bulkGraduate2Week(userId)
    if (lowerMessage.includes('complete')) return await bulkCompleteShortCourse(userId)
  }

  // 6. Reports & Forecasting
  if (lowerMessage.includes('report') || lowerMessage.includes('status') || lowerMessage.includes('forecast')) {
    if (lowerMessage.includes('training')) return await getTrainingReport()
    if (lowerMessage.includes('fee') || lowerMessage.includes('money')) return await getFeeStatus()
  }

  // 7. Operations (Reminders, Notes, Interviews)
  if (lowerMessage.includes('set reminder')) {
    const match = message.match(/set\s+reminder\s+for\s+([a-zA-Z\s]+)\s+in\s+(\d+)\s+hours?/i)
    if (match) return await setReminder(match[1].trim(), parseInt(match[2]), userId)
  }
  
  if (lowerMessage.includes('add note')) {
    const match = message.match(/add\s+note\s+for\s+([a-zA-Z\s]+):\s*(.+)/i)
    if (match) return await addNote(match[1].trim(), match[2].trim(), userId)
  }

  // 8. Predictive Analysis: "predict success for Mary"
  if (lowerMessage.includes('predict') && lowerMessage.includes('success')) {
    const match = message.match(/predict\s+success\s+(?:for\s+)?([a-zA-Z\s]+)/i)
    if (match) return await predictCandidateSuccess(match[1].trim())
  }

  return null
}

// IMPLEMENTATION FUNCTIONS

async function predictCandidateSuccess(name: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('candidates')
      .select('name, vetting_score, years_of_experience, role, status')
      .ilike('name', `%${name}%`)
      .limit(1)

    if (!data?.length) return `No candidate found matching "${name}" for success prediction.`

    const c = data[0]
    let prob = 0
    let reasons = []

    // Basic logic for prediction
    if (c.vetting_score > 70) { prob += 40; reasons.push("Strong vetting score") }
    else if (c.vetting_score > 50) { prob += 20; reasons.push("Average vetting score") }
    
    if (c.years_of_experience >= 5) { prob += 30; reasons.push("Extensive experience (5+ years)") }
    else if (c.years_of_experience >= 2) { prob += 15; reasons.push("Moderate experience") }

    if (['Nanny', 'House Manager', 'Chef'].includes(c.role)) { prob += 20; reasons.push("High-demand role") }
    
    prob = Math.min(prob + 10, 95) // Base probability cap

    return `SUCCESS PREDICTION FOR ${c.name.toUpperCase()}:\n` +
      `1. Probability: ${prob}%\n` +
      `2. Factors: ${reasons.join(', ')}\n` +
      `3. Recommendation: ${prob > 70 ? 'High priority for placement.' : prob > 40 ? 'Consider for niche training to boost score.' : 'Requires further vetting.'}`
  } catch (error: any) {
    return `Prediction error: ${error.message}`
  }
}

async function addCandidate(name: string, phone: string, role: string, userId: string): Promise<string> {
  try {
    const { error } = await supabase.from('niche_candidates').insert({
      name, phone, role,
      status: 'New Inquiry',
      category: role.toLowerCase().includes('short') ? 'Short Course' : '2-Week Flagship',
      created_at: new Date().toISOString(),
      created_by: userId
    })
    if (error) throw error
    return `✅ Done. Added ${name} (${phone}) as ${role} candidate to Niche Pipeline.`
  } catch (error: any) {
    return `Failed to add candidate: ${error.message}`
  }
}

async function addTrainee(name: string, phone: string, course: string, userId: string): Promise<string> {
  try {
    const trainingType = course.toLowerCase().includes('professional') || course.toLowerCase().includes('week') ? '2week' : 'short'
    const { error } = await supabase.from('niche_training').insert({
      name, phone, course,
      status: 'Active',
      training_type: trainingType,
      created_at: new Date().toISOString(),
      added_by: userId
    })
    if (error) throw error
    return `✅ Done. Enrolled ${name} in ${course}. Training Status: Active.`
  } catch (error: any) {
    return `Failed to add trainee: ${error.message}`
  }
}

async function universalSearch(query: string): Promise<string> {
  try {
    const [cand, trainee, client] = await Promise.all([
      supabase.from('candidates').select('name, role, status').ilike('name', `%${query}%`).limit(3),
      supabase.from('niche_training').select('name, course, status').ilike('name', `%${query}%`).limit(3),
      supabase.from('clients').select('name, status').ilike('name', `%${query}%`).limit(3)
    ])

    let results = []
    if (cand.data?.length) cand.data.forEach(r => results.push(`[Candidate] ${r.name} - ${r.role} (${r.status})`))
    if (trainee.data?.length) trainee.data.forEach(r => results.push(`[Trainee] ${r.name} - ${r.course} (${r.status})`))
    if (client.data?.length) client.data.forEach(r => results.push(`[Client] ${r.name} (${r.status})`))

    if (results.length === 0) return `No records found matching "${query}".`
    return `Search Results for "${query}":\n` + results.map((r, i) => `${i + 1}. ${r}`).join('\n')
  } catch (error: any) {
    return `Search error: ${error.message}`
  }
}

async function updateCandidateStatus(name: string, status: string, userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('candidates')
      .update({ status: status.toUpperCase() })
      .ilike('name', `%${name}%`)
      .select('name')
    
    if (error) throw error
    if (!data || data.length === 0) return `No candidate found matching "${name}".`
    return `✅ Status updated. ${data[0].name} is now ${status.toUpperCase()}.`
  } catch (error: any) {
    return `Failed to update status: ${error.message}`
  }
}

async function bulkGraduate2Week(userId: string): Promise<string> {
  try {
    const { data: trainees, error: fetchError } = await supabase
      .from('niche_training')
      .select('id, name')
      .eq('training_type', '2week')
      .eq('status', 'Active')

    if (fetchError) throw fetchError
    if (!trainees || trainees.length === 0) return `No active 2-week trainees found to graduate.`

    const { error: updateError } = await supabase
      .from('niche_training')
      .update({ status: 'Graduated', graduated_at: new Date().toISOString() })
      .eq('training_type', '2week')
      .eq('status', 'Active')

    if (updateError) throw updateError
    return `✅ Bulk graduation complete. ${trainees.length} trainee(s) marked as Graduated.`
  } catch (error: any) {
    return `Bulk graduate failed: ${error.message}`
  }
}

async function bulkCompleteShortCourse(userId: string): Promise<string> {
  try {
    const { data: trainees, error: fetchError } = await supabase
      .from('niche_training')
      .select('id, name')
      .eq('training_type', 'short')
      .eq('status', 'Active')

    if (fetchError) throw fetchError
    if (!trainees || trainees.length === 0) return `No active short course trainees found to complete.`

    const { error: updateError } = await supabase
      .from('niche_training')
      .update({ status: 'Completed', completed_at: new Date().toISOString() })
      .eq('training_type', 'short')
      .eq('status', 'Active')

    if (updateError) throw updateError
    return `✅ Bulk completion complete. ${trainees.length} trainee(s) marked as Completed.`
  } catch (error: any) {
    return `Bulk complete failed: ${error.message}`
  }
}

async function getTrainingReport(): Promise<string> {
  try {
    const { data: trainees } = await supabase.from('niche_training').select('status, training_type')
    if (!trainees || trainees.length === 0) return `No trainees in the system.`

    const report = {
      active2W: trainees.filter(t => t.training_type === '2week' && t.status === 'Active').length,
      activeSC: trainees.filter(t => t.training_type === 'short' && t.status === 'Active').length,
      graduated: trainees.filter(t => t.status === 'Graduated').length,
      completed: trainees.filter(t => t.status === 'Completed').length
    }

    return `TRAINING REPORT:\n1. Active 2-Week: ${report.active2W}\n2. Active Short Course: ${report.activeSC}\n3. Graduated (2-Week): ${report.graduated}\n4. Completed (Short): ${report.completed}\nTOTAL: ${trainees.length}`
  } catch (error: any) {
    return `Report error: ${error.message}`
  }
}

async function getFeeStatus(): Promise<string> {
  try {
    const { data: fees } = await supabase.from('niche_fees').select('balance')
    if (!fees || fees.length === 0) return `No fee records found.`

    const totalBalance = fees.reduce((sum, f) => sum + (f.balance || 0), 0)
    const withDebt = fees.filter(f => f.balance > 0).length

    return `FINANCIAL SUMMARY:\n1. Total Outstanding: KES ${totalBalance.toLocaleString()}\n2. Trainees with Balance: ${withDebt}\n3. Collection Rate: ${((1 - (totalBalance / (fees.length * 10000))) * 100).toFixed(1)}% (Estimated)`
  } catch (error: any) {
    return `Financial report error: ${error.message}`
  }
}

async function setReminder(name: string, hours: number, userId: string): Promise<string> {
  try {
    const reminderTime = new Date()
    reminderTime.setHours(reminderTime.getHours() + hours)
    const timeStr = reminderTime.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', hour12: true, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

    const { data } = await supabase.from('candidates').select('id, name').ilike('name', `%${name}%`).limit(1)
    if (!data?.length) return `No candidate found matching "${name}".`

    await supabase.from('candidates').update({ reminder_date: reminderTime.toISOString() }).eq('id', data[0].id)
    return `✅ Reminder set for ${data[0].name} at ${timeStr}.`
  } catch (error: any) {
    return `Reminder error: ${error.message}`
  }
}

async function addNote(name: string, note: string, userId: string): Promise<string> {
  try {
    const { data } = await supabase.from('candidates').select('id, name').ilike('name', `%${name}%`).limit(1)
    if (!data?.length) return `No candidate found matching "${name}".`

    await supabase.from('candidate_notes').insert({ candidate_id: data[0].id, note_text: note, created_by: userId })
    return `✅ Note added for ${data[0].name}: "${note}"`
  } catch (error: any) {
    return `Note error: ${error.message}`
  }
}
