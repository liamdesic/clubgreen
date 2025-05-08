import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import commonjs from 'vite-plugin-commonjs';

export default defineConfig({
  plugins: [sveltekit(), commonjs()],
  server: {
    https: {
      key: './cert/key.pem',
      cert: './cert/cert.pem'
    }
  }
});
