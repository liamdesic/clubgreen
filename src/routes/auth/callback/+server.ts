import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  const code = url.searchParams.get('code')
  
  if (code) {
    try {
      console.log('🔑 [AUTH] Exchanging code for session...')
      await supabase.auth.exchangeCodeForSession(code)
      console.log('✅ [AUTH] Code exchange successful')
    } catch (error) {
      console.error('❌ [AUTH] Code exchange failed:', error)
      // Still redirect to login but with error
      redirect(303, '/login?error=' + encodeURIComponent('Authentication failed. Please try again.'))
    }
  }

  // Get the redirect URL from the query parameters
  const redirectTo = url.searchParams.get('redirectTo') || '/'
  console.log('🔄 [AUTH] Redirecting to:', redirectTo)
  
  redirect(303, redirectTo)
} 