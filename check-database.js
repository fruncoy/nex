// Simple script to check database contents
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hiuuvrguhyahfrdayfdu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdXV2cmd1aHlhaGZyZGF5ZmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzMwMDksImV4cCI6MjA2OTgwOTAwOX0.psdX6FBJ4Ss-MJrU_cbIRdpaXaCQEVKi07yUEWerAdQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabase() {
  try {
    console.log('Checking trainee_grades table...')
    
    const { data: grades, error: gradesError } = await supabase
      .from('trainee_grades')
      .select('*')
    
    if (gradesError) {
      console.error('Error fetching grades:', gradesError)
      return
    }
    
    console.log(`Found ${grades.length} grades:`)
    grades.forEach((grade, index) => {
      console.log(`${index + 1}. ID: ${grade.id}, Final Score: ${grade.final_score}, Pillar Scores: [${grade.pillar1_score}, ${grade.pillar2_score}, ${grade.pillar3_score}, ${grade.pillar4_score}]`)
    })
    
    console.log('\nChecking niche_subpillar_grades table...')
    
    const { data: subGrades, error: subError } = await supabase
      .from('niche_subpillar_grades')
      .select('*')
    
    if (subError) {
      console.error('Error fetching sub-pillar grades:', subError)
      return
    }
    
    console.log(`Found ${subGrades.length} sub-pillar grade records`)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkDatabase()