import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [react()],
	test: {
		browser: {
			enabled: true,
			name: 'chrome', // or 'firefox', 'safari'
			provider: 'webdriverio',
			headless: true,
		},
		include: ['**/*.browser.test.{ts,tsx}'],
	},
});
