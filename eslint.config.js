// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  // Yalnızca `ignores` içeren nesne global yok sayma listesidir.
  {
    ignores: ['dist/*', '.expo/*', 'coverage/*'],
  },
  {
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
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
    // @typescript-eslint eklentisi yalnızca TS dosyalarında yüklü.
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Bilerek kullanılmayan değişken/argüman/catch parametreleri `_` ile başlamalı.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Node ile çalışan CommonJS betikleri ve yapılandırma dosyaları
    files: ['scripts/**/*.js', '*.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        module: 'writable',
        process: 'readonly',
        require: 'readonly',
      },
    },
  },
  {
    files: ['src/theme/**'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
]);
