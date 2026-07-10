/**
 * ATRIUM — Tailwind token bridge.
 *
 * If the project uses Tailwind, merge this into tailwind.config.js so that
 * Tailwind utilities and theme.css speak the same language. Without this you
 * end up with two styling systems fighting each other.
 *
 *   const atrium = require('./src/theme/tailwind.tokens.cjs');
 *   module.exports = {
 *     content: ['./index.html', './src/**\/*.{ts,tsx}'],
 *     theme: { extend: atrium.extend },
 *   };
 */

const extend = {
  colors: {
    forest: {
      900: '#0B2318',
      800: '#0F3123',
      700: '#14452F',
      600: '#1B5E3F',
      500: '#237A52',
      400: '#38996B',
      300: '#6FBE96',
      100: '#DCEDE4',
      50: '#F1F8F4',
    },
    ink: { DEFAULT: '#12150F', 2: '#3A3F3C' },
    mute: '#636966',
    faint: '#7C8380',
    line: { DEFAULT: '#E1E4E3', 2: '#EDEFEE' },
    grey: {
      50: '#F7F8F8',
      100: '#F1F3F2',
      200: '#E7EAE9',
      300: '#D6DAD9',
    },
  },
  fontFamily: {
    display: ["'Inter Tight'", 'system-ui', 'sans-serif'],
    body: ["'Inter'", 'system-ui', 'sans-serif'],
    mono: ["'JetBrains Mono'", 'ui-monospace', 'monospace'],
  },
  borderRadius: { s: '8px', DEFAULT: '12px', m: '16px', l: '22px' },
  boxShadow: {
    s: '0 1px 2px rgba(10,12,11,.05), 0 2px 8px rgba(10,12,11,.04)',
    m: '0 2px 6px rgba(10,12,11,.06), 0 12px 28px -8px rgba(10,12,11,.14)',
    l: '0 8px 24px -6px rgba(10,12,11,.14), 0 30px 60px -20px rgba(10,12,11,.22)',
    green: '0 6px 18px -4px rgba(27,94,63,.42)',
    spec: 'inset 0 1px 0 rgba(255,255,255,.9)',
  },
  transitionTimingFunction: { ios: 'cubic-bezier(0.32, 0.72, 0, 1)' },
  backdropBlur: { glass: '22px' },
};

module.exports = { extend };
