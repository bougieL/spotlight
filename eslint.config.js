import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import parserVue from 'vue-eslint-parser';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue', 'packages/**/*.vue'],
    plugins: {
      vue: pluginVue,
    },
    languageOptions: {
      parser: parserVue,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parser: tsParser,
      },
      globals: {
        ...globals.browser,
        ...globals.builtin,
      },
    },
    rules: {
      ...pluginVue.configs['flat/recommended'].rules,
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'no-console': 'warn',
      'no-debugger': 'warn',
      'max-params': ['error', 2],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', 'packages/**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.builtin,
      },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'no-debugger': 'warn',
      'max-params': ['error', 2],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'src-tauri/**'],
  },
];
