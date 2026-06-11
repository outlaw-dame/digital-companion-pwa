/**
 * Frontend ESLint Configuration
 * 
 * This configuration enforces Phase 11 architecture rules:
 * - Import boundary restrictions
 * - TypeScript support
 * - Vue 3 support
 * - Framework7/native migration governance
 */

import js from '@eslint/js';
import globals from 'globals';
import vue from 'eslint-plugin-vue';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { defineConfig } from 'eslint/config-helper';

export default defineConfig({
  ignores: [
    'node_modules/',
    'dist/',
    '*.config.js',
    '*.config.ts',
    'scripts/',
  ],

  files: ['**/*.{js,ts,vue}'],

  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.es2021,
      ...globals.node,
    },
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true,
      },
      project: './tsconfig.json',
      extraFileExtensions: ['.vue'],
    },
  },

  plugins: {
    vue,
    '@typescript-eslint': ts,
  },

  rules: {
    ...js.configs.recommended.rules,
    ...ts.configs.recommended.rules,
    ...vue.configs.recommended.rules,
    ...vue.configs['vue3-recommended'].rules,

    // ========================================================================
    // PHASE 11 ARCHITECTURE ENFORCEMENT RULES
    // ========================================================================

    // ---------------------------------------------------------------
    // 1. KONSTA IS HARD-BLOCKED EVERYWHERE
    // ---------------------------------------------------------------
    {
      rule: 'no-restricted-imports',
      id: 'block-konsta-everywhere',
      options: {
        paths: [
          {
            name: 'konsta',
            message: 'Konsta is BLOCKED. Do not use under any circumstances. Use Framework7 semantic components instead.',
          },
          {
            name: 'konsta/vue',
            message: 'Konsta Vue is BLOCKED. Do not use under any circumstances. Use Framework7 semantic components instead.',
          },
        ],
        patterns: [
          {
            group: ['konsta', 'konsta/*', 'konsta/vue', 'konsta/vue/*'],
            message: 'Konsta is BLOCKED. Do not use under any circumstances. Use Framework7 semantic components instead.',
          },
        ],
      },
      severity: 'error',
    },

    // ---------------------------------------------------------------
    // 2. RAW FRAMEWORK7 IMPORTS - ONLY ALLOWED IN design/semantic/
    // ---------------------------------------------------------------
    {
      rule: 'no-restricted-imports',
      id: 'block-raw-framework7',
      options: {
        paths: [
          {
            name: 'framework7-vue',
            message: 'Raw Framework7 imports are BLOCKED in this directory. Use semantic components from design/semantic/ instead.',
            allowFrom: [
              'client/src/design/semantic/',
              'client/src/design/framework7/',
            ],
          },
          {
            name: 'framework7',
            message: 'Raw Framework7 imports are BLOCKED in this directory. Use semantic components from design/semantic/ instead.',
            allowFrom: [
              'client/src/design/semantic/',
              'client/src/design/framework7/',
            ],
          },
        ],
        patterns: [
          {
            group: ['framework7', 'framework7/*', 'framework7-vue', 'framework7-vue/*'],
            message: 'Raw Framework7 imports are BLOCKED in this directory. Use semantic components from design/semantic/ instead.',
            allowFrom: [
              'client/src/design/semantic/**',
              'client/src/design/framework7/**',
            ],
          },
        ],
      },
      severity: 'error',
    },

    // ---------------------------------------------------------------
    // 3. RAW CAPACITOR IMPORTS - ONLY ALLOWED IN platform/
    // ---------------------------------------------------------------
    {
      rule: 'no-restricted-imports',
      id: 'block-raw-capacitor',
      options: {
        paths: [
          {
            name: '@capacitor/core',
            message: 'Raw Capacitor imports are BLOCKED in this directory. Use platform/ abstractions instead.',
            allowFrom: [
              'client/src/platform/',
              'client/src/composables/',
            ],
          },
          {
            name: '@capacitor/*',
            message: 'Raw Capacitor plugin imports are BLOCKED in this directory. Use platform/ abstractions instead.',
            allowFrom: [
              'client/src/platform/',
              'client/src/composables/',
            ],
          },
        ],
        patterns: [
          {
            group: ['@capacitor/**'],
            message: 'Raw Capacitor imports are BLOCKED in this directory. Use platform/ abstractions instead.',
            allowFrom: [
              'client/src/platform/**',
              'client/src/composables/**',
            ],
          },
        ],
      },
      severity: 'error',
    },

    // ---------------------------------------------------------------
    // 4. RAW ICONOIR IMPORTS - ONLY ALLOWED IN design/icons/ and AppIcon
    // ---------------------------------------------------------------
    {
      rule: 'no-restricted-imports',
      id: 'block-raw-iconoir',
      options: {
        paths: [
          {
            name: '@iconoir/core',
            message: 'Raw Iconoir imports are BLOCKED in this directory. Use <AppIcon> component instead.',
            allowFrom: [
              'client/src/design/icons/',
              'client/src/components/AppIcon.vue',
            ],
          },
          {
            name: '@iconoir/vue',
            message: 'Raw Iconoir Vue imports are BLOCKED in this directory. Use <AppIcon> component instead.',
            allowFrom: [
              'client/src/design/icons/',
              'client/src/components/AppIcon.vue',
            ],
          },
        ],
        patterns: [
          {
            group: ['@iconoir/**'],
            message: 'Raw Iconoir imports are BLOCKED in this directory. Use <AppIcon> component instead.',
            allowFrom: [
              'client/src/design/icons/**',
              'client/src/components/AppIcon.vue',
            ],
          },
        ],
      },
      severity: 'error',
    },

    // ========================================================================
    // IMPORT ORDER RULES
    // ========================================================================

    {
      rule: 'import/order',
      options: {
        groups: [
          'type',
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'object',
          'style',
        ],
        pathGroups: [
          {
            pattern: '@/**',
            group: 'internal',
            position: 'before',
          },
          {
            pattern: 'vue',
            group: 'external',
            position: 'before',
          },
          {
            pattern: '@vue/**',
            group: 'external',
            position: 'before',
          },
          {
            pattern: 'framework7*',
            group: 'external',
            position: 'before',
          },
          {
            pattern: '@capacitor/**',
            group: 'external',
            position: 'before',
          },
          {
            pattern: '@iconoir/**',
            group: 'external',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['type'],
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
        warnOnUnassignedImports: true,
      },
      severity: 'warn',
    },

    // ========================================================================
    // TYPESCRIPT SPECIFIC RULES
    // ========================================================================

    {
      rule: '@typescript-eslint/no-unused-vars',
      options: {
        args: 'all',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_',
      },
      severity: 'warn',
    },

    {
      rule: '@typescript-eslint/explicit-function-return-type',
      options: {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
      },
      severity: 'warn',
    },

    {
      rule: '@typescript-eslint/no-explicit-any',
      options: {
        fixToUnknown: false,
        ignoreRestArgs: true,
      },
      severity: 'warn',
    },

    // ========================================================================
    // VUE SPECIFIC RULES
    // ========================================================================

    {
      rule: 'vue/multi-word-component-names',
      options: [
        'always',
        {
          ignores: ['index', 'App', 'Router', 'Store'],
        },
      ],
      severity: 'error',
    },

    {
      rule: 'vue/no-v-html',
      severity: 'error',
    },

    {
      rule: 'vue/no-v-text-v-html-on-component',
      severity: 'error',
    },

    {
      rule: 'vue/require-v-for-key',
      severity: 'error',
    },

    {
      rule: 'vue/no-dupe-keys',
      severity: 'error',
    },

    {
      rule: 'vue/no-parsing-error',
      severity: 'error',
    },

    // ========================================================================
    // CODE QUALITY RULES
    // ========================================================================

    {
      rule: 'no-console',
      options: {
        allow: ['warn', 'error'],
      },
      severity: 'warn',
    },

    {
      rule: 'prefer-const',
      severity: 'error',
    },

    {
      rule: 'no-var',
      severity: 'error',
    },

    {
      rule: 'eqeqeq',
      options: ['always', { null: 'ignore' }],
      severity: 'error',
    },

    {
      rule: 'no-implicit-coercion',
      severity: 'warn',
    },

    {
      rule: 'no-param-reassign',
      severity: 'warn',
    },

    {
      rule: 'no-shadow',
      severity: 'warn',
    },

    {
      rule: 'no-unused-expressions',
      severity: 'warn',
    },

    {
      rule: 'guard-for-in',
      severity: 'warn',
    },

    // ========================================================================
    // ACCESSIBILITY RULES
    // ========================================================================

    {
      rule: 'vuejs-accessibility/accessible-emoji',
      severity: 'warn',
    },

    {
      rule: 'vuejs-accessibility/alt-text',
      severity: 'warn',
    },

    {
      rule: 'vuejs-accessibility/anchor-has-content',
      severity: 'error',
    },

    {
      rule: 'vuejs-accessibility/form-control-has-label',
      severity: 'error',
    },

    {
      rule: 'vuejs-accessibility/label-has-associated-control',
      severity: 'error',
    },

    {
      rule: 'vuejs-accessibility/image-button-has-alt',
      severity: 'error',
    },

    {
      rule: 'vuejs-accessibility/no-access-key-attribute',
      severity: 'warn',
    },

    {
      rule: 'vuejs-accessibility/no-aria-hidden-on-focusable',
      severity: 'error',
    },

    {
      rule: 'vuejs-accessibility/no-autofocus',
      severity: 'warn',
    },

    {
      rule: 'vuejs-accessibility/no-distracting-elements',
      severity: 'warn',
    },

    {
      rule: 'vuejs-accessibility/no-redundant-roles',
      severity: 'warn',
    },

    {
      rule: 'vuejs-accessibility/tabindex-no-positive',
      severity: 'error',
    },

    // ========================================================================
    // CUSTOM PHASE 11 RULES
    // ========================================================================

    // Enforce AppIcon usage
    {
      rule: 'no-restricted-syntax',
      id: 'enforce-app-icon',
      options: [
        {
          selector: "Property[key.name=['IconoirSearch','IconoirHome','IconoirSettings']]",
          message: 'Do not use Iconoir components directly. Use <AppIcon name="..." /> instead.',
        },
      ],
      severity: 'error',
    },

    // Enforce semantic component usage
    {
      rule: 'no-restricted-syntax',
      id: 'enforce-semantic-components',
      options: [
        {
          selector: "ImportDeclaration[source.value='framework7-vue'] ImportSpecifier[imported.name=/^(Page|Navbar|List|ListItem|Button|Searchbar|Dialog|Sheet|Toast|Actions|Popover|PhotoBrowser|VirtualList|Ptr|Segmented|Input|Textarea)$/]",
          message: 'Do not use raw Framework7 components. Use semantic components from design/semantic/ instead.',
        },
      ],
      severity: 'error',
    },
  },
});
