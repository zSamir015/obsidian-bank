import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const COPY_PROPS =
  '/^(aria-label|aria-description|aria-valuetext|aria-roledescription|alt|title|placeholder|label|hint|error)$/'

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettier],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Visible copy comes from the message catalogues in src/i18n/messages. Tests may use literals.
    files: ['src/**/*.tsx'],
    ignores: ['src/**/*.test.tsx', 'src/test/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...[
          // Text between tags.
          'JSXText[value=/\\p{L}/u]',
          // Strings rendered as children or passed to props that are read out or shown:
          // directly, as either branch of a ternary, or as the right side of && and ??.
          ...[':matches(JSXElement, JSXFragment) >', `JSXAttribute[name.name=${COPY_PROPS}] >`].flatMap((parent) =>
            ['', 'ConditionalExpression >', 'LogicalExpression >'].flatMap((wrapper) => [
              `${parent} JSXExpressionContainer > ${wrapper} Literal[value=/\\p{L}/u]`,
              `${parent} JSXExpressionContainer > ${wrapper} TemplateLiteral > TemplateElement[value.raw=/\\p{L}/u]`,
            ]),
          ),
          `JSXAttribute[name.name=${COPY_PROPS}] > Literal[value=/\\p{L}/u]`,
        ].map((selector) => ({
          selector,
          message: 'Hard-coded copy: add it to the message catalogues in src/i18n/messages and read it with useI18n().',
        })),
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'supabase/**/*.ts', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
)
