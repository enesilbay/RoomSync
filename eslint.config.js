// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
      // Bilerek kullanılmayan değişken/argüman/catch parametreleri `_` ile başlamalı.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Ham hex renkleri yasak: renkler src/theme token'larından okunmalı.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#([0-9a-fA-F]{3,8})$/]',
          message:
            'Ham hex renk kullanmayın; src/theme içindeki bir token kullanın. / Do not use raw hex colors; use a token from src/theme.',
        },
      ],
    },
  },
  {
    files: ['src/theme/**'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
]);
