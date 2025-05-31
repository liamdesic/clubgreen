/// <reference types="@sveltejs/kit" />

// This file contains type declarations for SvelteKit's environment variables
// See: https://kit.svelte.dev/docs/configuration#env

// For $env/static/private
declare module '$env/static/private' {
  export const STRIPE_SECRET_KEY: string;
  export const STRIPE_WEBHOOK_SECRET: string;
  export const STRIPE_PRICE_ID: string;
  export const SUPABASE_SERVICE_ROLE_KEY: string;
}

// For $env/static/public
declare module '$env/static/public' {
  export const PUBLIC_SUPABASE_URL: string;
  export const PUBLIC_SUPABASE_ANON_KEY: string;
  export const PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  export const PUBLIC_STRIPE_PRICE_ID: string;
  export const PUBLIC_SUPABASE_REDIRECT_URL: string;
}

// For $env/dynamic/private
declare module '$env/dynamic/private' {
  export const env: {
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    STRIPE_PRICE_ID: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    [key: string]: string | undefined;
  };
}

// For $env/dynamic/public
declare module '$env/dynamic/public' {
  export const env: {
    PUBLIC_SUPABASE_URL: string;
    PUBLIC_SUPABASE_ANON_KEY: string;
    PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
    PUBLIC_STRIPE_PRICE_ID: string;
    PUBLIC_SUPABASE_REDIRECT_URL: string;
    [key: string]: string | undefined;
  };
}
