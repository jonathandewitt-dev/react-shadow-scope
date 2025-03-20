import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [react()],
	test: {
		environment: 'happy-dom',
		setupFiles: './test/setup.ts',
		include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/**', 'src/test/**', '**/*.d.ts'],
		},
	},
});
