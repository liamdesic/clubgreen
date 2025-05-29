import type { Session, SupabaseClient, User } from '@supabase/supabase-js'

declare global {
  namespace App {
    interface Locals {
      supabase: ReturnType<typeof import('$lib/supabase/server').createServerClient>
      getSession: () => Promise<{ user: User | null }>
    }
    interface PageData {
      session: { user: User } | null
    }
    // interface Error {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {}
