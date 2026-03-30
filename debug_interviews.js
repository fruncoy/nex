// Debug script to check interview sync issues
// Run this in your browser console on the Interviews page

async function debugInterviews() {
  console.log('=== DEBUGGING INTERVIEW SYNC ISSUES ===')
  
  // Check candidates with INTERVIEW_SCHEDULED status
  const { data: scheduledCandidates, error: candidatesError } = await supabase
    .from('candidates')
    .select('id, name, phone, status, scheduled_date')
    .eq('status', 'INTERVIEW_SCHEDULED')
  
  if (candidatesError) {
    console.error('Error fetching scheduled candidates:', candidatesError)
    return
  }
  
  console.log('Candidates with INTERVIEW_SCHEDULED status:', scheduledCandidates)
  
  // Check all interviews
  const { data: allInterviews, error: interviewsError } = await supabase
    .from('interviews')
    .select(`
      *,
      candidates (
        name,
        phone,
        status
      )
    `)
  
  if (interviewsError) {
    console.error('Error fetching interviews:', interviewsError)
    return
  }
  
  console.log('All interviews:', allInterviews)
  
  // Find candidates with INTERVIEW_SCHEDULED but no interview record
  const candidatesWithoutInterviews = scheduledCandidates.filter(candidate => 
    !allInterviews.some(interview => interview.candidate_id === candidate.id)
  )
  
  console.log('Candidates marked as INTERVIEW_SCHEDULED but no interview record:', candidatesWithoutInterviews)
  
  // Find interviews without candidate data
  const interviewsWithoutCandidates = allInterviews.filter(interview => !interview.candidates)
  
  console.log('Interviews without candidate data:', interviewsWithoutCandidates)
  
  // Check database schema for interviews table
  const { data: interviewsSchema, error: schemaError } = await supabase
    .rpc('exec_sql', { 
      sql: "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'interviews' ORDER BY ordinal_position;" 
    })
  
  if (!schemaError) {
    console.log('Interviews table schema:', interviewsSchema)
  }
  
  console.log('=== DEBUG COMPLETE ===')
}

// Run the debug function
debugInterviews()