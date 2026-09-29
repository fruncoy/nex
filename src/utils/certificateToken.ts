import { supabase } from '../lib/supabase'

/**
 * Returns the full public verification URL for a given grade record.
 * If the record does not yet have a certificate_token, generates one
 * and saves it to Supabase before returning the URL.
 *
 * The token is a UUID that is unguessable and does not expose any
 * internal database IDs in the public URL.
 */
export async function getOrCreateVerificationUrl(
  gradeId: string,
  existingToken?: string | null
): Promise<string> {
  const baseUrl = 'https://member.nestara.co.ke'

  if (existingToken) {
    return `${baseUrl}/verify/${existingToken}`
  }

  // Generate a new token and persist it to the database
  const newToken = crypto.randomUUID()

  const { error } = await supabase
    .from('trainee_grades')
    .update({ certificate_token: newToken })
    .eq('id', gradeId)

  if (error) {
    throw new Error(`Failed to save certificate token: ${error.message}`)
  }

  return `${baseUrl}/verify/${newToken}`
}
