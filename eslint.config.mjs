import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'demo/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // The build helpers are Node scripts, not library source.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly' },
    },
  },
  {
    rules: {
      // The rig deliberately reads loosely-typed params off a caller-supplied
      // object; the narrowing happens at the boundary, not in the signature.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
