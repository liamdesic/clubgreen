import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import commonjs from 'vite-plugin-commonjs';

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  
  // Log environment variables for debugging (only in dev)
  if (mode === 'development') {
    console.log('Environment variables loaded:', {
      PUBLIC_STRIPE_PUBLISHABLE_KEY: env.PUBLIC_STRIPE_PUBLISHABLE_KEY ? '***' + 
        env.PUBLIC_STRIPE_PUBLISHABLE_KEY.slice(-4) : 'Not set',
      MODE: mode
    });
  }

  return {
    plugins: [sveltekit(), commonjs()],
    // Server configuration
    server: mode === 'development' ? {
      fs: {
        strict: false
      }
    } : {},
    // Expose all VITE_ and PUBLIC_ prefixed environment variables
    envPrefix: ['VITE_', 'PUBLIC_'],
    // Explicitly define the env variables to expose to the client
    define: {
      // Supabase
      'import.meta.env.PUBLIC_SUPABASE_URL': JSON.stringify(env.PUBLIC_SUPABASE_URL || ''),
      'import.meta.env.PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.PUBLIC_SUPABASE_ANON_KEY || ''),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || env.PUBLIC_SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || env.PUBLIC_SUPABASE_ANON_KEY || ''),
      // Stripe
      'import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY': JSON.stringify(env.PUBLIC_STRIPE_PUBLISHABLE_KEY || ''),
      
      // App mode
      'import.meta.env.MODE': JSON.stringify(mode)
    }
  };
});
