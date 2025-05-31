import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Environment variables are accessed via import.meta.env in SvelteKit

// Helper to get environment variables safely
function getEnvVars() {
  const publicVars = {
    PUBLIC_STRIPE_PUBLISHABLE_KEY: import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY 
      ? '***' + String(import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY).slice(-4) 
      : 'Not set',
    PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL || 'Not set',
    PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY 
      ? '***' + String(import.meta.env.PUBLIC_SUPABASE_ANON_KEY).slice(-4) 
      : 'Not set',
    PUBLIC_SUPABASE_REDIRECT_URL: import.meta.env.PUBLIC_SUPABASE_REDIRECT_URL || 'Not set',
    PUBLIC_STRIPE_PRICE_ID: import.meta.env.PUBLIC_STRIPE_PRICE_ID || 'Not set'
  };

  const privateVars = {
    STRIPE_SECRET_KEY: import.meta.env.STRIPE_SECRET_KEY 
      ? '***' + String(import.meta.env.STRIPE_SECRET_KEY).slice(-4) 
      : 'Not set',
    STRIPE_WEBHOOK_SECRET: import.meta.env.STRIPE_WEBHOOK_SECRET 
      ? '***' + String(import.meta.env.STRIPE_WEBHOOK_SECRET).slice(-4) 
      : 'Not set',
    SUPABASE_SERVICE_ROLE_KEY: import.meta.env.SUPABASE_SERVICE_ROLE_KEY 
      ? '***' + String(import.meta.env.SUPABASE_SERVICE_ROLE_KEY).slice(-4) 
      : 'Not set'
  };

  return { publicVars, privateVars };
}

export const GET: RequestHandler = async () => {
  return json({
    nodeEnv: import.meta.env.MODE || 'development',
    publicStripeKey: import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY 
      ? `***${String(import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY).slice(-4)}` 
      : 'Not set',
    allEnv: getEnvVars()
  });
};
