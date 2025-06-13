import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		noExternal: ['@sveltejs/kit']
	},
	// Enhanced logging for agentic development
	logLevel: 'info',
	server: {
		// Enable detailed logging
		hmr: {
			overlay: true
		}
	},
	// Better source maps for debugging
	build: {
		sourcemap: true
	}
});
