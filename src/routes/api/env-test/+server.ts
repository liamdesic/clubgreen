import { json } from '@sveltejs/kit';
import { 
  PUBLIC_STRIPE_PUBLISHABLE_KEY,
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
  VITE_STRIPE_PUBLISHABLE_KEY,
  VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY,
  VITE_SUPABASE_REDIRECT_URL,
  VITE_LOCAL_DEV,
  VITE_STRIPE_PRICE_ID
} from '$env/static/public';
import {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_ID,
  SUPABASE_SERVICE_ROLE_KEY
} from '$env/static/private';
import type { RequestHandler } from './$types';

// Helper to get environment variables safely
function getEnvVars() {
  const publicVars = {
    PUBLIC_STRIPE_PUBLISHABLE_KEY: PUBLIC_STRIPE_PUBLISHABLE_KEY ? '***' + PUBLIC_STRIPE_PUBLISHABLE_KEY.slice(-4) : 'Not set',
    PUBLIC_SUPABASE_URL: PUBLIC_SUPABASE_URL || 'Not set',
    PUBLIC_SUPABASE_ANON_KEY: PUBLIC_SUPABASE_ANON_KEY ? '***' + PUBLIC_SUPABASE_ANON_KEY.slice(-4) : 'Not set',
    VITE_STRIPE_PUBLISHABLE_KEY: VITE_STRIPE_PUBLISHABLE_KEY ? '***' + VITE_STRIPE_PUBLISHABLE_KEY.slice(-4) : 'Not set',
    VITE_STRIPE_PRICE_ID: VITE_STRIPE_PRICE_ID || 'Not set',
    VITE_SUPABASE_URL: VITE_SUPABASE_URL || 'Not set',
    VITE_SUPABASE_ANON_KEY: VITE_SUPABASE_ANON_KEY ? '***' + VITE_SUPABASE_ANON_KEY.slice(-4) : 'Not set',
    VITE_SUPABASE_REDIRECT_URL: VITE_SUPABASE_REDIRECT_URL || 'Not set',
    VITE_LOCAL_DEV: VITE_LOCAL_DEV || 'Not set'
  };

  const privateVars = {
    STRIPE_SECRET_KEY: STRIPE_SECRET_KEY ? '***' + STRIPE_SECRET_KEY.slice(-4) : 'Not set',
    STRIPE_WEBHOOK_SECRET: STRIPE_WEBHOOK_SECRET ? '***' + STRIPE_WEBHOOK_SECRET.slice(-4) : 'Not set',
    STRIPE_PRICE_ID: STRIPE_PRICE_ID || 'Not set',
    SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY ? '***' + SUPABASE_SERVICE_ROLE_KEY.slice(-4) : 'Not set'
  };
  
  return {
    ...publicVars,
    ...privateVars
  };
}

export const GET: RequestHandler = async () => {
  return json({
    nodeEnv: import.meta.env.MODE || 'development',
    publicStripeKey: PUBLIC_STRIPE_PUBLISHABLE_KEY 
      ? `***${PUBLIC_STRIPE_PUBLISHABLE_KEY.slice(-4)}` 
      : 'Not set',
    allEnv: getEnvVars()
  });
};
