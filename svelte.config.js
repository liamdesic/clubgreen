import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      // Optional Vercel adapter options
      // See https://github.com/sveltejs/kit/tree/master/packages/adapter-vercel#configuration
      // for more information
    })
  },
  // Move Vite config outside of kit
  vitePlugin: {
    // Add Vite plugin options here
  }
};

export default config;