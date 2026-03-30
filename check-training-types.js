// Script to check training types in the database
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hiuuvrguhyahfrdayfdu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdXV2cmd1aHlhaGZyZGF5ZmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzMwMDksImV4cCI6MjA2OTgwOTAwOX0.psdX6FBJ4Ss-MJrU_cbIRdpaXaCQEVKi07yUEWerAdQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTrainingTypes() {
  try {
    console.log('Checking training types in trainee_grades table...\n')
    
    const { data: grades, error } = await supabase
      .from('trainee_grades')
      .select(`
        id,
        training_type,
        final_score,
        niche_training!inner(name, role)
      `)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error:', error)
      return
    }
    
    if (!grades || grades.length === 0) {
      console.log('No grades found in database')
      return
    }
    
    console.log(`Found ${grades.length} graded records:\n`)
    
    const trainingTypeCounts = { nanny: 0, house_manager: 0, other: 0 }
    
    grades.forEach((grade, index) => {
      console.log(`${index + 1}. ${grade.niche_training.name}`)
      console.log(`   Training Type: ${grade.training_type}`)
      console.log(`   Role: ${grade.niche_training.role}`)
      console.log(`   Final Score: ${grade.final_score}`)
      console.log('')
      
      if (grade.training_type === 'nanny') {
        trainingTypeCounts.nanny++
      } else if (grade.training_type === 'house_manager') {
        trainingTypeCounts.house_manager++
      } else {
        trainingTypeCounts.other++
      }
    })
    
    console.log('Summary:')
    console.log(`- Nanny: ${trainingTypeCounts.nanny}`)
    console.log(`- House Manager: ${trainingTypeCounts.house_manager}`)
    console.log(`- Other/Unknown: ${trainingTypeCounts.other}`)
    
  } catch (error) {
    console.error('Error checking training types:', error)
  }
}

checkTrainingTypes()