import { createServerClient } from '$lib/supabase/server'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ cookies }) => {
  const supabase = createServerClient(cookies)
  const { data: { session } } = await supabase.auth.getSession()

  return {
    session
  }
}
