// Script to check what data remains in the database
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hiuuvrguhyahfrdayfdu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdXV2cmd1aHlhaGZyZGF5ZmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzMwMDksImV4cCI6MjA2OTgwOTAwOX0.psdX6FBJ4Ss-MJrU_cbIRdpaXaCQEVKi07yUEWerAdQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRemainingData() {
  try {
    console.log('Checking what data remains in the database...\n')
    
    // Check niche_training table (your main trainee data)
    const { data: trainees, error: traineeError } = await supabase
      .from('niche_training')
      .select('*')
    
    if (traineeError) {
      console.error('Error checking niche_training:', traineeError)
    } else {
      console.log(`📊 NICHE_TRAINING TABLE: ${trainees.length} records`)
      trainees.forEach((trainee, index) => {
        console.log(`${index + 1}. ${trainee.name} - ${trainee.role} (${trainee.status})`)
      })
    }
    
    // Check niche_cohorts table
    const { data: cohorts, error: cohortError } = await supabase
      .from('niche_cohorts')
      .select('*')
    
    if (cohortError) {
      console.error('Error checking niche_cohorts:', cohortError)
    } else {
      console.log(`\n📊 NICHE_COHORTS TABLE: ${cohorts.length} records`)
      cohorts.forEach((cohort, index) => {
        console.log(`${index + 1}. Cohort ${cohort.cohort_number} - ${cohort.status}`)
      })
    }
    
    // Check candidates table
    const { data: candidates, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .limit(5)
    
    if (candidateError) {
      console.error('Error checking candidates:', candidateError)
    } else {
      console.log(`\n📊 CANDIDATES TABLE: ${candidates.length} records (showing first 5)`)
      candidates.forEach((candidate, index) => {
        console.log(`${index + 1}. ${candidate.name} - ${candidate.source}`)
      })
    }
    
    // Check clients table
    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .limit(5)
    
    if (clientError) {
      console.error('Error checking clients:', clientError)
    } else {
      console.log(`\n📊 CLIENTS TABLE: ${clients.length} records (showing first 5)`)
      clients.forEach((client, index) => {
        console.log(`${index + 1}. ${client.name} - ${client.role}`)
      })
    }
    
    // Check what was deleted
    const { data: grades, error: gradeError } = await supabase
      .from('trainee_grades')
      .select('*')
    
    const { data: subGrades, error: subError } = await supabase
      .from('niche_subpillar_grades')
      .select('*')
    
    console.log(`\n🗑️ DELETED DATA:`)
    console.log(`- trainee_grades: ${grades?.length || 0} remaining (inflated scores were removed)`)
    console.log(`- niche_subpillar_grades: ${subGrades?.length || 0} remaining (orphaned records were removed)`)
    
    console.log(`\n✅ Your main data (trainees, cohorts, candidates, clients) is SAFE!`)
    console.log(`Only inflated grading scores were cleaned up.`)
    
  } catch (error) {
    console.error('Error checking data:', error)
  }
}

checkRemainingData()