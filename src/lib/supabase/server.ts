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

export function createAdminClient() {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Create a simple cookie store for the admin client
  const cookieStore = {
    getItem: (key: string) => null,
    setItem: (key: string, value: string) => {},
    removeItem: (key: string) => {}
  };

  return _createServerClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    cookies: {
      get: (key) => cookieStore.getItem(key),
      set: (key, value, options) => {
        cookieStore.setItem(key, value);
      },
      remove: (key, options) => {
        cookieStore.removeItem(key);
      }
    }
  });
}
