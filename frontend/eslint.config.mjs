// npm install --save-dev globals eslint eslint-plugin-react eslint-plugin-import eslint-plugin-react-hooks
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from "globals";

export default [
  // Global Ignores
  { 
    ignores: ["**/dist/**", "**/node_modules/**", "**/.next/**", "**/build/**"] 
  },

  // 1. YOUR EXISTING FRONTEND/BROWSER CONFIG
  {
    files: ['src/**/*.{js,jsx,mjs,cjs,ts,tsx}'], // OPTIONAL TIP: Scoping this to 'src/' prevents it from touching root configs
    plugins: {
      'react': reactPlugin,
      'import': importPlugin,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          js: true,
          mjs: true,
          jsx: true,
        },
      },
      globals: {
      ...globals.browser,   // Enables console, window, document, etc.
      },
    },
    rules: {
      // Combines best practice configurations manually for Flat Config compatibility
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactPlugin.configs.flat["jsx-runtime"].rules,
      ...reactHooks.configs.flat.recommended.rules,
      
      // This rule catches the missing module imports you asked about:
      'import/no-unresolved': 'error',
      // This catches variables/components used in JSX that were never imported:
      'no-undef': 'error',
      // Standard React rules
      'react/jsx-no-undef': 'error',
      
      // Custom overrides
      'react-hooks/set-state-in-effect': 'off',   // Turn off AGGRESSIVE SETSTATE WARNING
      'react-hooks/exhaustive-deps': 'off',       // Turn off missing dependency
      "react/prop-types": "off",                  // Handled perfectly by TypeScript
      'react/react-in-jsx-scope': 'off',          // Turn off if using React 17+
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.mjs', '.cjs'] },
      },
      'import/extensions': ['.js', '.jsx', '.mjs', '.cjs'],
    },
  },

  // ADDED: SPECIFIC CONFIG FOR commonjs
  {
    files: ['src/**/*.{cjs}'],
    languageOptions: {
      sourceType: 'commonjs', // Allows require/module.exports processing
      globals: {
        ...globals.node, // ADDED: Enables __dirname, require, and module
      },
    },
    rules: {
      'no-undef': 'error', // Keeps checking for real typos, but ignores valid Node globals
    },
  },
];
