import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';

export default [
  { ignores: ['dist*/**', 'playwright-report/**', 'test-results/**', '.astro/**'] },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { parser },
    plugins: { '@typescript-eslint': tseslint },
    rules: { 'no-undef': 'off', ...tseslint.configs.recommended.rules }
  }
];
