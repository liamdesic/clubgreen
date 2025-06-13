import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-vercel';
import commonjs from 'vite-plugin-commonjs';
import { defineConfig, loadEnv } from 'vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Svelte preprocessor
  preprocess: vitePreprocess(),
  
  // SvelteKit configuration
  kit: {
    adapter: adapter({
      // Optional Vercel adapter options
      // See https://github.com/sveltejs/kit/tree/master/packages/adapter-vercel#configuration
    }),
    alias: {
      '$lib': './src/lib',
      '$lib/validations': './src/lib/validations'
    }
  },
  
  // Vite configuration
  vite: {
    plugins: [sveltekit(), commonjs()],
    
    // Server configuration
    server: process.env.NODE_ENV === 'development' ? {
      fs: {
        strict: false
      }
    } : {},
    
    // Only expose PUBLIC_ prefixed environment variables
    envPrefix: 'PUBLIC_',
    
    // Explicitly define the env variables to expose to the client
    define: {
      // Supabase
      'import.meta.env.PUBLIC_SUPABASE_URL': JSON.stringify(process.env.PUBLIC_SUPABASE_URL || ''),
      'import.meta.env.PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.PUBLIC_SUPABASE_ANON_KEY || ''),
      // Stripe
      'import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY': JSON.stringify(process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY || ''),
      // Leaderboard
      'import.meta.env.PUBLIC_LEADERBOARD_API_KEY': JSON.stringify(process.env.PUBLIC_LEADERBOARD_API_KEY || ''),
      // App mode
      'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV || 'production')
    },
    
    // Add optimizeDeps configuration for @svelte-plugins/datepicker
    optimizeDeps: {
      include: ['@svelte-plugins/datepicker']
    }
  }
};

export default config;