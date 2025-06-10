import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import commonjs from 'vite-plugin-commonjs';

export default defineConfig(({ mode }) => {
  // Load environment variables - load all env vars regardless of prefix
  const env = loadEnv(mode, process.cwd(), '');
  
  // Make all environment variables available to server-side code
  process.env = { ...process.env, ...env };
  
  // Log environment variables for debugging (only in dev)
  if (mode === 'development') {
    console.log('Environment variables loaded:', {
      PUBLIC_STRIPE_PUBLISHABLE_KEY: env.PUBLIC_STRIPE_PUBLISHABLE_KEY ? '***' + 
        env.PUBLIC_STRIPE_PUBLISHABLE_KEY.slice(-4) : 'Not set',
      STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY ? '***' + 
        env.STRIPE_SECRET_KEY.slice(-4) : 'Not set',
      STRIPE_PRICE_ID: env.STRIPE_PRICE_ID || 'Not set',
      MODE: mode
    });
    
    console.log('Environment variables injected into process.env');
  }

  return {
    plugins: [sveltekit(), commonjs()],
    // Server configuration
    server: mode === 'development' ? {
      fs: {
        strict: false
      }
    } : {},
    // Only expose PUBLIC_ prefixed environment variables
    envPrefix: 'PUBLIC_',
    // Explicitly define the env variables to expose to the client
    define: {
      // Supabase
      'import.meta.env.PUBLIC_SUPABASE_URL': JSON.stringify(env.PUBLIC_SUPABASE_URL || ''),
      'import.meta.env.PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.PUBLIC_SUPABASE_ANON_KEY || ''),
      // Stripe
      'import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY': JSON.stringify(env.PUBLIC_STRIPE_PUBLISHABLE_KEY || ''),
      // Leaderboard
      'import.meta.env.PUBLIC_LEADERBOARD_API_KEY': JSON.stringify(env.PUBLIC_LEADERBOARD_API_KEY || ''),
      // App mode
      'import.meta.env.MODE': JSON.stringify(mode)
    },
    // Add optimizeDeps configuration for @svelte-plugins/datepicker
    optimizeDeps: {
      include: ['@svelte-plugins/datepicker']
    },
    // Add ssr configuration
    ssr: {
      noExternal: ['@svelte-plugins/datepicker']
    },
    // Optimize CSS loading
    css: {
      devSourcemap: true,
      // Optimize CSS delivery
      modules: {
        // Use a more specific naming pattern for CSS modules
        generateScopedName: mode === 'production'
          ? '[hash:base64:8]'
          : '[name]__[local]__[hash:base64:5]'
      }
    }
  };
});
