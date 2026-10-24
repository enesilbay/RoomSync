// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // BİLİNÇLİ TERCİH (PORTFOLYO):
      // React Native animasyonları (Animated.Value) ve useEffect tetikleyicilerindeki bazı custom state
      // güncellemeleri exhaustive-deps eklendiğinde sonsuz döngülere yol açmaktadır.
      // Proje portfolyo amaçlı olduğundan bu kural bilinçli olarak kapatılmıştır.
      'react-hooks/exhaustive-deps': 'off',
      // Kullanılmayan değişkenleri (örn: catch (e)) ignore etmek için:
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^(e|flist|handleLogout|pomAnim|ScrollView|Platform|_)$', 'caughtErrorsIgnorePattern': '^e$' }
      ]
    }
  },
]);
