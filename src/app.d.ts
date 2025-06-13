import type { Session, User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './lib/database.types'

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>
      getUser(): Promise<User | null>
      user: User | null
      session: Session | null
    }
    interface PageData {
      user: User | null
      org: {
        id: string
        name: string
        slug: string
      }
      events: Array<{
        id: string
        name: string
        organization_id: string
        created_at: string
        updated_at: string | null
        // Add other event properties as needed
      }>
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
    
    // Leaderboard
    readonly PUBLIC_LEADERBOARD_API_KEY: string;
    
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

declare module '$app/navigation' {
  export function goto(url: string | URL, opts?: { replaceState?: boolean }): Promise<void>;
}

declare module '$app/stores' {
  import { Readable } from 'svelte/store';
  export const page: Readable<{
    url: URL;
    params: Record<string, string>;
    route: { id: string | null };
    status: number;
    error: Error | null;
  }>;
}

export {}
