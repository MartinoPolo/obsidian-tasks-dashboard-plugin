import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		}
	},
	{
		rules: {
			eqeqeq: ['error', 'smart'],
			'object-shorthand': 'warn',
			curly: ['warn', 'all'],
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-floating-promises': 'warn',
			'@typescript-eslint/await-thenable': 'warn',
			'@typescript-eslint/no-unnecessary-condition': [
				'warn',
				{
					allowConstantLoopConditions: true
				}
			],
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					destructuredArrayIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					argsIgnorePattern: '^_'
				}
			],
			'@typescript-eslint/strict-boolean-expressions': 'error'
		}
	},
	{
		ignores: ['node_modules/**', 'main.js', 'dist/**', '*.config.js', '*.config.mjs']
	}
);
