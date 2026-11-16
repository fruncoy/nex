// Script to clean up inflated scores using Supabase client
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hiuuvrguhyahfrdayfdu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdXV2cmd1aHlhaGZyZGF5ZmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzMwMDksImV4cCI6MjA2OTgwOTAwOX0.psdX6FBJ4Ss-MJrU_cbIRdpaXaCQEVKi07yUEWerAdQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupInflatedScores() {
  try {
    console.log('Starting cleanup of inflated scores...')
    
    // First, check for any inflated scores
    const { data: inflatedGrades, error: checkError } = await supabase
      .from('trainee_grades')
      .select('*')
      .or('final_score.gt.100,pillar1_score.gt.100,pillar2_score.gt.100,pillar3_score.gt.100,pillar4_score.gt.100')
    
    if (checkError) {
      console.error('Error checking for inflated scores:', checkError)
      return
    }
    
    console.log(`Found ${inflatedGrades.length} records with inflated scores`)
    
    if (inflatedGrades.length > 0) {
      inflatedGrades.forEach(grade => {
        console.log(`- Grade ID: ${grade.id}, Final: ${grade.final_score}, Pillars: [${grade.pillar1_score}, ${grade.pillar2_score}, ${grade.pillar3_score}, ${grade.pillar4_score}]`)
      })
      
      // Delete inflated grades
      const { error: deleteError } = await supabase
        .from('trainee_grades')
        .delete()
        .or('final_score.gt.100,pillar1_score.gt.100,pillar2_score.gt.100,pillar3_score.gt.100,pillar4_score.gt.100')
      
      if (deleteError) {
        console.error('Error deleting inflated grades:', deleteError)
      } else {
        console.log('Successfully deleted inflated grades')
      }
    }
    
    // Clean up orphaned sub-pillar grades
    console.log('Cleaning up orphaned sub-pillar grades...')
    
    // Get all grade IDs that exist in main table
    const { data: validGrades, error: validError } = await supabase
      .from('trainee_grades')
      .select('id')
    
    if (validError) {
      console.error('Error getting valid grade IDs:', validError)
      return
    }
    
    const validGradeIds = validGrades.map(g => g.id)
    console.log(`Found ${validGradeIds.length} valid grade IDs`)
    
    // Get all sub-pillar grades
    const { data: allSubGrades, error: subError } = await supabase
      .from('niche_subpillar_grades')
      .select('grade_id')
    
    if (subError) {
      console.error('Error getting sub-pillar grades:', subError)
      return
    }
    
    // Find orphaned sub-pillar grades
    const orphanedGradeIds = allSubGrades
      .filter(sub => !validGradeIds.includes(sub.grade_id))
      .map(sub => sub.grade_id)
    
    console.log(`Found ${orphanedGradeIds.length} orphaned sub-pillar grade records`)
    
    if (orphanedGradeIds.length > 0) {
      // Delete orphaned sub-pillar grades
      const { error: deleteSubError } = await supabase
        .from('niche_subpillar_grades')
        .delete()
        .in('grade_id', orphanedGradeIds)
      
      if (deleteSubError) {
        console.error('Error deleting orphaned sub-pillar grades:', deleteSubError)
      } else {
        console.log('Successfully deleted orphaned sub-pillar grades')
      }
    }
    
    // Final count
    const { data: finalGrades } = await supabase.from('trainee_grades').select('id')
    const { data: finalSubGrades } = await supabase.from('niche_subpillar_grades').select('grade_id')
    
    console.log('Final counts:')
    console.log(`- Main grades: ${finalGrades?.length || 0}`)
    console.log(`- Sub-pillar grades: ${finalSubGrades?.length || 0}`)
    
    console.log('Cleanup completed!')
    
  } catch (error) {
    console.error('Error during cleanup:', error)
  }
}

cleanupInflatedScores()