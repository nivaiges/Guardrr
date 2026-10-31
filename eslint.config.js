// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    files: ['scripts/**/*.js', 'e2e/**/*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'coverage/*', 'test-results/*'],
  },
]);
