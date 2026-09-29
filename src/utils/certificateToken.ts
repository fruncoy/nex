import { supabase } from '../lib/supabase'

const BASE_URL = 'https://member.nestara.co.ke'

/**
 * Returns the full public verification URL for a certificate.
 *
 * @param recordId     - The UUID of the grade/training record
 * @param existingToken - The current certificate_token value (if already set)
 * @param table        - 'trainee_grades' for flagship, 'niche_training' for short courses
 */
export async function getOrCreateVerificationUrl(
  recordId: string,
  existingToken?: string | null,
  table: 'trainee_grades' | 'niche_training' = 'trainee_grades'
): Promise<string> {
  if (existingToken) {
    return `${BASE_URL}/verify/${existingToken}`
  }

  // Generate a new UUID token and persist it
  const newToken = crypto.randomUUID()

  const { error } = await supabase
    .from(table)
    .update({ certificate_token: newToken })
    .eq('id', recordId)

  if (error) {
    throw new Error(`Failed to save certificate token: ${error.message}`)
  }

  return `${BASE_URL}/verify/${newToken}`
}
