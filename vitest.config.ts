import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [react()],
	test: {
		browser: {
			enabled: true,
			headless: true,
			provider: 'playwright',
			instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }],
		},
		include: ['**/*.test.{ts,tsx}'],
		exclude: ['**/node_modules/'],
	},
});
