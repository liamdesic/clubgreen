import { json } from '@sveltejs/kit';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

// Helper to get environment variables safely
function getEnvVars() {
  const publicVars = {
    PUBLIC_STRIPE_PUBLISHABLE_KEY: publicEnv.PUBLIC_STRIPE_PUBLISHABLE_KEY 
      ? '***' + publicEnv.PUBLIC_STRIPE_PUBLISHABLE_KEY.slice(-4) 
      : 'Not set',
    PUBLIC_SUPABASE_URL: publicEnv.PUBLIC_SUPABASE_URL || 'Not set',
    PUBLIC_SUPABASE_ANON_KEY: publicEnv.PUBLIC_SUPABASE_ANON_KEY 
      ? '***' + publicEnv.PUBLIC_SUPABASE_ANON_KEY.slice(-4) 
      : 'Not set',
    PUBLIC_SUPABASE_REDIRECT_URL: publicEnv.PUBLIC_SUPABASE_REDIRECT_URL || 'Not set',
    PUBLIC_STRIPE_PRICE_ID: publicEnv.PUBLIC_STRIPE_PRICE_ID || 'Not set'
  };

  const privateVars = {
    STRIPE_SECRET_KEY: privateEnv.STRIPE_SECRET_KEY 
      ? '***' + privateEnv.STRIPE_SECRET_KEY.slice(-4) 
      : 'Not set',
    STRIPE_WEBHOOK_SECRET: privateEnv.STRIPE_WEBHOOK_SECRET 
      ? '***' + privateEnv.STRIPE_WEBHOOK_SECRET.slice(-4) 
      : 'Not set',
    SUPABASE_SERVICE_ROLE_KEY: privateEnv.SUPABASE_SERVICE_ROLE_KEY 
      ? '***' + privateEnv.SUPABASE_SERVICE_ROLE_KEY.slice(-4) 
      : 'Not set'
  };

  return { publicVars, privateVars };
}

export const GET: RequestHandler = async () => {
  return json({
    nodeEnv: import.meta.env.MODE || 'development',
    publicStripeKey: publicEnv.PUBLIC_STRIPE_PUBLISHABLE_KEY 
      ? `***${publicEnv.PUBLIC_STRIPE_PUBLISHABLE_KEY.slice(-4)}` 
      : 'Not set',
    allEnv: getEnvVars()
  });
};
