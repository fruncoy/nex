// Script to fix missing interview records for candidates with INTERVIEW_SCHEDULED status
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hiuuvrguhyahfrdayfdu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdXV2cmd1aHlhaGZyZGF5ZmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzMwMDksImV4cCI6MjA2OTgwOTAwOX0.psdX6FBJ4Ss-MJrU_cbIRdpaXaCQEVKi07yUEWerAdQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixMissingInterviews() {
  try {
    console.log('🔍 Finding candidates with INTERVIEW_SCHEDULED status...')
    
    // Get all candidates with INTERVIEW_SCHEDULED status
    const { data: candidates, error: candidatesError } = await supabase
      .from('candidates')
      .select('id, name, phone, scheduled_date, status')
      .eq('status', 'INTERVIEW_SCHEDULED')
    
    if (candidatesError) {
      console.error('Error fetching candidates:', candidatesError)
      return
    }
    
    console.log(`📋 Found ${candidates.length} candidates with INTERVIEW_SCHEDULED status`)
    
    if (candidates.length === 0) {
      console.log('✅ No candidates with INTERVIEW_SCHEDULED status found')
      return
    }
    
    // Check which ones don't have interview records
    const candidateIds = candidates.map(c => c.id)
    
    const { data: existingInterviews, error: interviewsError } = await supabase
      .from('interviews')
      .select('candidate_id')
      .in('candidate_id', candidateIds)
    
    if (interviewsError) {
      console.error('Error fetching interviews:', interviewsError)
      return
    }
    
    const existingCandidateIds = new Set(existingInterviews.map(i => i.candidate_id))
    const missingInterviews = candidates.filter(c => !existingCandidateIds.has(c.id))
    
    console.log(`❌ Found ${missingInterviews.length} candidates missing interview records:`)
    
    if (missingInterviews.length === 0) {
      console.log('✅ All candidates with INTERVIEW_SCHEDULED status have interview records')
      return
    }
    
    // Display missing interviews
    missingInterviews.forEach((candidate, index) => {
      console.log(`${index + 1}. ${candidate.name} (${candidate.phone}) - Scheduled: ${candidate.scheduled_date || 'No date'}`)
    })
    
    console.log('\n🔧 Creating missing interview records...')
    
    // Create interview records for missing ones
    const interviewsToCreate = missingInterviews.map(candidate => {
      // Use scheduled_date if available, otherwise set to tomorrow at 9 AM
      let interviewDate
      if (candidate.scheduled_date) {
        interviewDate = new Date(candidate.scheduled_date)
      } else {
        interviewDate = new Date()
        interviewDate.setDate(interviewDate.getDate() + 1) // Tomorrow
        interviewDate.setHours(9, 0, 0, 0) // 9:00 AM
      }
      
      return {
        candidate_id: candidate.id,
        date_time: interviewDate.toISOString(),
        location: 'Office',
        assigned_staff: null,
        attended: false,
        outcome: null
      }
    })
    
    const { data: createdInterviews, error: createError } = await supabase
      .from('interviews')
      .insert(interviewsToCreate)
      .select()
    
    if (createError) {
      console.error('Error creating interviews:', createError)
      return
    }
    
    console.log(`✅ Successfully created ${createdInterviews.length} interview records`)
    
    // Update candidates with proper scheduled_date if they didn't have one
    const candidatesNeedingDateUpdate = missingInterviews.filter(c => !c.scheduled_date)
    
    if (candidatesNeedingDateUpdate.length > 0) {
      console.log(`📅 Updating scheduled_date for ${candidatesNeedingDateUpdate.length} candidates...`)
      
      for (let i = 0; i < candidatesNeedingDateUpdate.length; i++) {
        const candidate = candidatesNeedingDateUpdate[i]
        const interview = createdInterviews[i]
        
        await supabase
          .from('candidates')
          .update({ scheduled_date: interview.date_time })
          .eq('id', candidate.id)
      }
      
      console.log('✅ Updated scheduled_date for candidates')
    }
    
    console.log('\n🎉 Fix completed! All candidates with INTERVIEW_SCHEDULED status now have interview records.')
    
  } catch (error) {
    console.error('❌ Script failed:', error)
  }
}

// Run the fix
fixMissingInterviews()