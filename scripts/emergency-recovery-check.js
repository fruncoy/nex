// Emergency script to check for any recoverable data
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hiuuvrguhyahfrdayfdu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdXV2cmd1aHlhaGZyZGF5ZmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzMwMDksImV4cCI6MjA2OTgwOTAwOX0.psdX6FBJ4Ss-MJrU_cbIRdpaXaCQEVKi07yUEWerAdQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRecoveryOptions() {
  try {
    console.log('🚨 CHECKING RECOVERY OPTIONS...\n')
    
    // Check all tables that might have data
    const tables = [
      'niche_training',
      'niche_cohorts', 
      'trainee_grades',
      'niche_subpillar_grades',
      'candidates',
      'clients',
      'training_leads',
      'interviews',
      'updates'
    ]
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (!error && data) {
          const { count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
          
          console.log(`📊 ${table}: ${count || 0} records`)
          
          if (count > 0 && table === 'niche_subpillar_grades') {
            console.log('🎉 FOUND SUB-PILLAR GRADES! Checking details...')
            const { data: samples } = await supabase
              .from(table)
              .select('*')
              .limit(3)
            
            samples.forEach((sample, i) => {
              console.log(`Sample ${i+1}:`, sample)
            })
          }
        }
      } catch (err) {
        console.log(`❌ ${table}: Table doesn't exist or no access`)
      }
    }
    
    // Check if Supabase has any built-in recovery options
    console.log('\n🔍 CHECKING FOR RECENT CHANGES...')
    
    // Try to see recent activity (this might not work with anon key)
    try {
      const { data: recentGrades } = await supabase
        .from('trainee_grades')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      
      console.log('Recent grades:', recentGrades)
    } catch (err) {
      console.log('Cannot access recent grades')
    }
    
  } catch (error) {
    console.error('Error checking recovery options:', error)
  }
}

checkRecoveryOptions()