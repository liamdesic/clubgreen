import type { Session, User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './lib/database.types'

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>
      getUser(): Promise<User | null>
      user: User | null
    }
    interface PageData {
      user: User | null
    }
    // interface Error {}
    // interface PageState {}
    // interface Platform {}
  }

  // For Vite environment variables
  interface ImportMetaEnv {
    // Supabase
    readonly PUBLIC_SUPABASE_URL: string;
    readonly PUBLIC_SUPABASE_ANON_KEY: string;
    readonly SUPABASE_SERVICE_ROLE_KEY: string;
    
    // Stripe
    readonly STRIPE_SECRET_KEY: string;
    readonly STRIPE_WEBHOOK_SECRET: string;
    readonly STRIPE_PRICE_ID: string;
    readonly PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
    
    // Environment
    readonly VITE_LOCAL_DEV?: string;
    readonly VITE_SUPABASE_REDIRECT_URL?: string;
    readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
    readonly VITE_STRIPE_PRICE_ID?: string;
    
    // Add other environment variables as needed
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {}
