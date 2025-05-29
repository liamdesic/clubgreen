import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr'
import type { Cookies } from '@sveltejs/kit'

export function createServerClient(cookies: Cookies) {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return _createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(key: string) {
        return cookies.get(key)
      },
      set(key: string, value: string, options: CookieOptions) {
        cookies.set(key, value, options)
      },
      remove(key: string, options: CookieOptions) {
        cookies.delete(key, options)
      }
    }
  })
}
