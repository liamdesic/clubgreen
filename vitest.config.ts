import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    svelte({ hot: !process.env.VITEST })
  ],
  test: {
    globals: true,
    environment: 'node', // Use node environment for API tests
    setupFiles: ['./test/setup.ts'],
    include: ['test/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.svelte-kit/**',
        '**/test/**'
      ],
    },
  },
  resolve: {
    alias: {
      $lib: resolve(__dirname, './src/lib'),
      $app: resolve(__dirname, './.svelte-kit/runtime/app')
    }
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || ''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
    'import.meta.env.PUBLIC_SUPABASE_URL': JSON.stringify(process.env.PUBLIC_SUPABASE_URL || ''),
    'import.meta.env.PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.PUBLIC_SUPABASE_ANON_KEY || ''),
    'import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY': JSON.stringify(process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY || ''),
    'import.meta.env.STRIPE_WEBHOOK_SECRET': JSON.stringify(process.env.STRIPE_WEBHOOK_SECRET || ''),
    'import.meta.env.STRIPE_SECRET_KEY': JSON.stringify(process.env.STRIPE_SECRET_KEY || '')
  }
});
