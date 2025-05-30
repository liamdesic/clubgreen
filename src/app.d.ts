import type { Session, User } from '@supabase/supabase-js'

declare global {
  namespace App {
    interface Locals {
      supabase: ReturnType<typeof import('@supabase/ssr').createServerClient>
      getSession: () => Promise<{ session: Session | null; user: User | null }>
      session: Session | null
      user: User | null
    }
    interface PageData {
      session: Session | null
      user: User | null
    }
    // interface Error {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {}
