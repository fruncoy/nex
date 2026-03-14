// Script to fix inflated scores in the database
// This script recalculates all scores from sub-pillar grades and updates the database

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hiuuvrguhyahfrdayfdu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdXV2cmd1aHlhaGZyZGF5ZmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzMwMDksImV4cCI6MjA2OTgwOTAwOX0.psdX6FBJ4Ss-MJrU_cbIRdpaXaCQEVKi07yUEWerAdQ'
const supabase = createClient(supabaseUrl, supabaseKey)

// Define pillar structures (same as in NicheGrading.tsx)
const nannyPillars = [
  {
    name: 'Childcare & Development',
    weight: 1.8,
    subpillars: [
      'child_hygiene_safety', 'routine_management', 'behavior_management', 
      'potty_training', 'first_aid'
    ]
  },
  {
    name: 'Professional Conduct',
    weight: 1.2,
    subpillars: [
      'receives_correction', 'nanny_communication', 'emotional_control', 
      'boundaries_ethics', 'reliability'
    ]
  },
  {
    name: 'Housekeeping',
    weight: 0.6,
    subpillars: [
      'child_room_hygiene', 'toy_sanitation', 'bathroom_cleanliness', 
      'daily_reset', 'laundry_care'
    ]
  },
  {
    name: 'Cooking & Nutrition',
    weight: 0.4,
    subpillars: [
      'child_safe_food_prep', 'age_appropriate_meals', 'food_allergy_awareness', 
      'kitchen_hygiene_storage', 'family_food_prep'
    ]
  }
]

const houseManagerPillars = [
  {
    name: 'Professional Conduct',
    weight: 1.2,
    subpillars: [
      'authority_leadership', 'hm_communication', 'stress_management', 
      'discretion_confidentiality', 'decision_making'
    ]
  },
  {
    name: 'Housekeeping & Systems',
    weight: 1.2,
    subpillars: [
      'cleaning_standards', 'household_routines', 'organization_systems', 
      'housekeeping_appliances', 'laundry_ironing'
    ]
  },
  {
    name: 'Cooking & Kitchen',
    weight: 1.0,
    subpillars: [
      'kitchen_hygiene_safety', 'meal_planning', 'food_prep_presentation', 
      'storage_system', 'cleaning_maintenance'
    ]
  },
  {
    name: 'Childcare Literacy',
    weight: 0.6,
    subpillars: [
      'child_development_knowledge', 'routine_understanding', 'nanny_coordination', 
      'role_boundaries', 'safety_awareness'
    ]
  }
]

function calculatePillarScores(subPillarGrades, trainingType) {
  const pillars = trainingType === 'nanny' ? nannyPillars : houseManagerPillars
  
  // Calculate pillar averages from sub-pillars (1-5 scale)
  const pillarScores = pillars.map(pillar => {
    const subpillarValues = pillar.subpillars.map(sub => subPillarGrades[sub] || 3)
    const average = subpillarValues.reduce((sum, val) => sum + val, 0) / subpillarValues.length
    return average
  })
  
  // Convert to percentage (multiply by 20 to get 1-5 scale to 20-100 scale)
  const pillarPercentages = pillarScores.map(score => score * 20)
  
  // Apply weights to get weighted contributions (already in percentage form)
  const totalWeight = pillars.reduce((sum, pillar) => sum + pillar.weight, 0)
  const weightedScores = pillarPercentages.map((score, index) => {
    const weight = pillars[index].weight
    return (score * weight) / totalWeight
  })
  
  // Final score is sum of weighted contributions
  const finalScore = weightedScores.reduce((sum, score) => sum + score, 0)
  
  const tier = finalScore >= 95 ? 'MASTER' :
               finalScore >= 90 ? 'DISTINGUISHED' :
               finalScore >= 80 ? 'EXCEPTIONAL' :
               finalScore >= 70 ? 'EXCELLENT' : 'NONE'
  
  return { pillarScores, weightedScores, finalScore, tier }
}

async function fixDatabaseScores() {
  try {
    console.log('Starting database score fix...')
    
    // Get all grades with their sub-pillar data
    const { data: grades, error: gradesError } = await supabase
      .from('trainee_grades')
      .select(`
        id, 
        training_type,
        trainee_id,
        pillar1_score,
        pillar2_score, 
        pillar3_score,
        pillar4_score,
        final_score
      `)
    
    if (gradesError) throw gradesError
    
    console.log(`Found ${grades.length} grades to check`)
    
    for (const grade of grades) {
      console.log(`\nProcessing grade ID: ${grade.id}`)
      console.log(`Current scores: P1=${grade.pillar1_score}, P2=${grade.pillar2_score}, P3=${grade.pillar3_score}, P4=${grade.pillar4_score}, Final=${grade.final_score}`)
      
      // Get sub-pillar grades
      const { data: subGrades, error: subError } = await supabase
        .from('niche_subpillar_grades')
        .select('*')
        .eq('grade_id', grade.id)
        .single()
      
      if (subError) {
        console.log(`No sub-pillar grades found for grade ${grade.id}, skipping...`)
        continue
      }
      
      // Recalculate scores
      const scores = calculatePillarScores(subGrades, grade.training_type)
      
      // Convert pillar scores to percentage scale (20-100) for database storage
      const pillar1 = Math.round(scores.pillarScores[0] * 20)
      const pillar2 = Math.round(scores.pillarScores[1] * 20)
      const pillar3 = Math.round(scores.pillarScores[2] * 20)
      const pillar4 = Math.round(scores.pillarScores[3] * 20)
      
      console.log(`Recalculated scores: P1=${pillar1}, P2=${pillar2}, P3=${pillar3}, P4=${pillar4}, Final=${scores.finalScore.toFixed(1)}`)
      
      // Check if scores need updating (if current scores are inflated)
      const needsUpdate = grade.final_score > 100 || 
                         grade.pillar1_score > 100 || 
                         grade.pillar2_score > 100 || 
                         grade.pillar3_score > 100 || 
                         grade.pillar4_score > 100
      
      if (needsUpdate) {
        console.log('Updating inflated scores...')
        
        // Update the grade with correct scores
        const { error: updateError } = await supabase
          .from('trainee_grades')
          .update({
            pillar1_score: pillar1,
            pillar2_score: pillar2,
            pillar3_score: pillar3,
            pillar4_score: pillar4,
            pillar1_weighted: scores.weightedScores[0],
            pillar2_weighted: scores.weightedScores[1],
            pillar3_weighted: scores.weightedScores[2],
            pillar4_weighted: scores.weightedScores[3],
            final_score: scores.finalScore,
            tier: scores.tier
          })
          .eq('id', grade.id)
        
        if (updateError) {
          console.error(`Error updating grade ${grade.id}:`, updateError)
        } else {
          console.log(`✅ Successfully updated grade ${grade.id}`)
        }
      } else {
        console.log('Scores look correct, no update needed')
      }
    }
    
    console.log('\n✅ Database score fix completed!')
    
  } catch (error) {
    console.error('Error fixing database scores:', error)
  }
}

// Run the fix
fixDatabaseScores()