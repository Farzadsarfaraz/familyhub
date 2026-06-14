// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // HTML entities don't render in React Native text — rule is web-only
      'react/no-unescaped-entities': 'off',
    },
  },
]);
