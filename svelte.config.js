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
  }
};

export default config;