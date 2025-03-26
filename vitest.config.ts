import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [
		react(),
		{
			name: 'static',
			configureServer(server) {
				server.middlewares.use((req, res, next) => {
					if (req.url?.endsWith('.css')) {
						res.setHeader('Content-Type', 'text/css');
						res.end('.test { color: red; }');
						return;
					}
					next();
				});
			},
		},
	],
	test: {
		browser: {
			enabled: true,
			headless: true,
			provider: 'playwright',
			instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }],
		},
		include: ['**/*.test.{ts,tsx}'],
		exclude: ['**/node_modules/'],
		coverage: {
			provider: 'istanbul',
			include: ['src/**'],
		},
	},
});
