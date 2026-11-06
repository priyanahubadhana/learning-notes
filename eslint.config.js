import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'src/vendor']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // Sync (L3): vendor code and vendor addresses stay inside the connectors.
  // Everything else imports `sync/connectors` (its index) only.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/sync/connectors/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/connectors/supabase',
                '**/connectors/google',
                '**/connectors/memory',
                '**/connectors/config',
                '@supabase/*',
                'googleapis',
              ],
              message:
                'Vendor code stays inside src/sync/connectors; import its index.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Literal[value=/supabase\\.co|www\\.googleapis\\.com|accounts\\.google\\.com/]',
          message: 'Vendor addresses stay inside src/sync/connectors.',
        },
        {
          selector:
            'TemplateElement[value.raw=/supabase\\.co|www\\.googleapis\\.com|accounts\\.google\\.com/]',
          message: 'Vendor addresses stay inside src/sync/connectors.',
        },
      ],
    },
  },
])
