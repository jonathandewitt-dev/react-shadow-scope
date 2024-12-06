/** @type {import("eslint").Linter.Config} */
const config = {
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: true,
	},
	plugins: ['@typescript-eslint'],
	extends: ['plugin:@typescript-eslint/recommended-type-checked', 'plugin:@typescript-eslint/stylistic-type-checked'],
	rules: {
		'@typescript-eslint/array-type': 'off',
		'@typescript-eslint/consistent-type-definitions': 'off',
		'@typescript-eslint/consistent-type-imports': [
			'warn',
			{
				prefer: 'type-imports',
				fixStyle: 'inline-type-imports',
			},
		],
		'@typescript-eslint/no-unused-vars': [
			'error',
			{
				argsIgnorePattern: '^_',
			},
		],
		'@typescript-eslint/require-await': 'off',
		'@typescript-eslint/no-misused-promises': [
			'error',
			{
				checksVoidReturn: {
					attributes: false,
				},
			},
		],
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/no-unsafe-call': 'off',
	},
	overrides: [
		{
			files: ['**/*.test.ts'],
			env: {
				node: true,
			},
			rules: {
				'@typescript-eslint/no-floating-promises': 'off',
			},
		},
	],
	ignorePatterns: ['demo', 'dist', 'vendor', 'www', '**/*.ejs', '**config.js', '**config.ts'],
};
module.exports = config;
