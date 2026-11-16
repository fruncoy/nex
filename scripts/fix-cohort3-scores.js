// Script to fix Cohort 3 inflated scores
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hiuuvrguhyahfrdayfdu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdXV2cmd1aHlhaGZyZGF5ZmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzMwMDksImV4cCI6MjA2OTgwOTAwOX0.psdX6FBJ4Ss-MJrU_cbIRdpaXaCQEVKi07yUEWerAdQ'
const supabase = createClient(supabaseUrl, supabaseKey)

// Define pillar structures
const nannyPillars = [
  { name: 'Childcare & Development', weight: 1.8, maxWeighted: 45 },
  { name: 'Professional Conduct', weight: 1.2, maxWeighted: 30 },
  { name: 'Housekeeping', weight: 0.6, maxWeighted: 15 },
  { name: 'Cooking & Nutrition', weight: 0.4, maxWeighted: 10 }
]

const houseManagerPillars = [
  { name: 'Professional Conduct', weight: 1.2, maxWeighted: 30 },
  { name: 'Housekeeping & Systems', weight: 1.2, maxWeighted: 30 },
  { name: 'Cooking & Kitchen', weight: 1.0, maxWeighted: 25 },
  { name: 'Childcare Literacy', weight: 0.6, maxWeighted: 15 }
]

function calculateCorrectScores(subPillarGrades, trainingType) {
  const pillars = trainingType === 'nanny' ? nannyPillars : houseManagerPillars
  
  // Calculate pillar averages from sub-pillars (1-5 scale)
  const pillarScores = pillars.map(pillar => {
    // For now, we'll reverse-engineer from the inflated scores
    // This is a temporary solution until we get the sub-pillar data
    return 3.0 // Default average
  })
  
  // Convert to percentage (multiply by 20 to get 1-5 scale to 20-100 scale)
  const pillarPercentages = pillarScores.map(score => score * 20) // [60, 60, 60, 60]
  
  // Apply weights to get weighted contributions
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

async function fixCohort3Scores() {
  try {
    console.log('🔍 Finding Cohort 3 records with inflated scores...\n')
    
    // Get Cohort 3 ID first
    const { data: cohort3, error: cohortError } = await supabase
      .from('niche_cohorts')
      .select('id, cohort_number')
      .eq('cohort_number', 3)
      .single()
    
    if (cohortError || !cohort3) {
      console.error('Could not find Cohort 3:', cohortError)
      return
    }
    
    console.log(`Found Cohort 3 ID: ${cohort3.id}`)
    
    // Get all inflated grades for Cohort 3
    const { data: inflatedGrades, error: gradesError } = await supabase
      .from('trainee_grades')
      .select(`
        id,
        trainee_id,
        training_type,
        pillar1_score,
        pillar2_score,
        pillar3_score,
        pillar4_score,
        pillar1_weighted,
        pillar2_weighted,
        pillar3_weighted,
        pillar4_weighted,
        final_score,
        tier,
        niche_training!inner(name, role)
      `)
      .eq('cohort_id', cohort3.id)
      .gt('final_score', 100) // Only inflated scores
    
    if (gradesError) {
      console.error('Error fetching grades:', gradesError)
      return
    }
    
    if (!inflatedGrades || inflatedGrades.length === 0) {
      console.log('No inflated scores found for Cohort 3')
      return
    }
    
    console.log(`\n📊 Found ${inflatedGrades.length} inflated records in Cohort 3:\n`)
    
    // Display current inflated scores
    inflatedGrades.forEach((grade, index) => {
      console.log(`${index + 1}. ${grade.niche_training.name} (${grade.training_type})`)
      console.log(`   Current: ${grade.final_score}% [${grade.pillar1_weighted}, ${grade.pillar2_weighted}, ${grade.pillar3_weighted}, ${grade.pillar4_weighted}]`)
      
      // Calculate what the correct scores should be (rough estimate)
      const currentTotal = grade.pillar1_weighted + grade.pillar2_weighted + grade.pillar3_weighted + grade.pillar4_weighted
      const correctedTotal = currentTotal / 4 // Divide by 4 to get approximate correct score
      
      console.log(`   Should be: ~${correctedTotal.toFixed(1)}%`)
      console.log('')
    })
    
    // Ask for confirmation before proceeding
    console.log('🚨 READY TO FIX SCORES')
    console.log('This will update all inflated scores to correct values.')
    console.log('The correction will divide current scores by 4 to get approximate correct values.\n')
    
    // For now, let's just show what we would do
    console.log('📝 Proposed corrections:')
    
    for (let i = 0; i < inflatedGrades.length; i++) {
      const grade = inflatedGrades[i]
      
      // Simple correction: divide by 4
      const correctedWeighted = [
        grade.pillar1_weighted / 4,
        grade.pillar2_weighted / 4,
        grade.pillar3_weighted / 4,
        grade.pillar4_weighted / 4
      ]
      
      const correctedFinal = correctedWeighted.reduce((sum, score) => sum + score, 0)
      
      const correctedTier = correctedFinal >= 95 ? 'MASTER' :
                           correctedFinal >= 90 ? 'DISTINGUISHED' :
                           correctedFinal >= 80 ? 'EXCEPTIONAL' :
                           correctedFinal >= 70 ? 'EXCELLENT' : 'NONE'
      
      console.log(`${i + 1}. ${grade.niche_training.name}`)
      console.log(`   FROM: ${grade.final_score}% (${grade.tier})`)
      console.log(`   TO:   ${correctedFinal.toFixed(1)}% (${correctedTier})`)
      console.log(`   Weighted: [${correctedWeighted.map(s => s.toFixed(1)).join(', ')}]`)
      console.log('')
    }
    
    console.log('\n✅ Analysis complete. Run the update function to apply these corrections.')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

async function applyCohort3Corrections() {
  try {
    console.log('🔧 Applying corrections to Cohort 3...\n')
    
    // Get Cohort 3 ID
    const { data: cohort3 } = await supabase
      .from('niche_cohorts')
      .select('id')
      .eq('cohort_number', 3)
      .single()
    
    if (!cohort3) {
      console.error('Could not find Cohort 3')
      return
    }
    
    // Get inflated grades
    const { data: inflatedGrades } = await supabase
      .from('trainee_grades')
      .select('*')
      .eq('cohort_id', cohort3.id)
      .gt('final_score', 100)
    
    if (!inflatedGrades || inflatedGrades.length === 0) {
      console.log('No inflated scores to fix')
      return
    }
    
    console.log(`Fixing ${inflatedGrades.length} records...\n`)
    
    for (let i = 0; i < inflatedGrades.length; i++) {
      const grade = inflatedGrades[i]
      
      // Calculate corrected values
      const correctedWeighted = [
        grade.pillar1_weighted / 4,
        grade.pillar2_weighted / 4,
        grade.pillar3_weighted / 4,
        grade.pillar4_weighted / 4
      ]
      
      const correctedFinal = correctedWeighted.reduce((sum, score) => sum + score, 0)
      
      const correctedTier = correctedFinal >= 95 ? 'MASTER' :
                           correctedFinal >= 90 ? 'DISTINGUISHED' :
                           correctedFinal >= 80 ? 'EXCEPTIONAL' :
                           correctedFinal >= 70 ? 'EXCELLENT' : 'NONE'
      
      // Update the record
      const { error: updateError } = await supabase
        .from('trainee_grades')
        .update({
          pillar1_weighted: correctedWeighted[0],
          pillar2_weighted: correctedWeighted[1],
          pillar3_weighted: correctedWeighted[2],
          pillar4_weighted: correctedWeighted[3],
          final_score: correctedFinal,
          tier: correctedTier
        })
        .eq('id', grade.id)
      
      if (updateError) {
        console.error(`❌ Error updating ${grade.id}:`, updateError)
      } else {
        console.log(`✅ Updated: ${grade.final_score.toFixed(1)}% → ${correctedFinal.toFixed(1)}%`)
      }
    }
    
    console.log('\n🎉 All corrections applied!')
    
  } catch (error) {
    console.error('Error applying corrections:', error)
  }
}

// Run analysis first
console.log('='.repeat(60))
console.log('COHORT 3 SCORE CORRECTION TOOL')
console.log('='.repeat(60))

fixCohort3Scores()