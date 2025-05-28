import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Helper to get environment variables safely
function getEnvVars() {
  const env = process.env || {};
  const filteredVars: Record<string, string> = {};
  
  // Get all environment variables that match our criteria
  Object.entries(env).forEach(([key, value]) => {
    if (
      key.includes('STRIPE') || 
      key.includes('PUBLIC') || 
      key.includes('VITE') ||
      key === 'NODE_ENV' ||
      key === 'MODE'
    ) {
      // Mask sensitive values
      if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN')) {
        filteredVars[key] = value ? `***${value.slice(-4)}` : 'Not set';
      } else {
        filteredVars[key] = value || 'Not set';
      }
    }
  });
  
  return filteredVars;
}

export const GET: RequestHandler = async () => {
  return json({
    nodeEnv: process.env.NODE_ENV || 'development',
    publicStripeKey: process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY 
      ? `***${process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY.slice(-4)}` 
      : 'Not set',
    allEnv: getEnvVars()
  });
};
