// Script to check sub-pillar grades and recreate main grades
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hiuuvrguhyahfrdayfdu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdXV2cmd1aHlhaGZyZGF5ZmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzMwMDksImV4cCI6MjA2OTgwOTAwOX0.psdX6FBJ4Ss-MJrU_cbIRdpaXaCQEVKi07yUEWerAdQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSubPillarGrades() {
  try {
    console.log('Checking all sub-pillar grades...')
    
    const { data: subGrades, error: subError } = await supabase
      .from('niche_subpillar_grades')
      .select('*')
    
    if (subError) {
      console.error('Error fetching sub-pillar grades:', subError)
      return
    }
    
    console.log(`Found ${subGrades.length} sub-pillar grade records:`)
    subGrades.forEach((record, index) => {
      console.log(`${index + 1}. Grade ID: ${record.grade_id}`)
      console.log(`   Sample values: child_hygiene_safety=${record.child_hygiene_safety}, authority_leadership=${record.authority_leadership}`)
      console.log(`   Created: ${record.created_at}`)
      console.log('')
    })
    
    // Check if there are any trainee records
    console.log('Checking niche_training table...')
    const { data: trainees, error: traineeError } = await supabase
      .from('niche_training')
      .select('id, name, role, status')
      .limit(10)
    
    if (traineeError) {
      console.error('Error fetching trainees:', traineeError)
    } else {
      console.log(`Found ${trainees.length} trainees:`)
      trainees.forEach(trainee => {
        console.log(`- ${trainee.name} (${trainee.role}) - ${trainee.status}`)
      })
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkSubPillarGrades()