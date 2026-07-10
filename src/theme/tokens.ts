/**
 * ATRIUM tokens, typed.
 * Charts and any JS that needs a colour should import from here —
 * never hardcode a hex in a component.
 */

export const forest = {
  900: '#0B2318',
  800: '#0F3123',
  700: '#14452F',
  600: '#1B5E3F',
  500: '#237A52',
  400: '#38996B',
  300: '#6FBE96',
  100: '#DCEDE4',
  50: '#F1F8F4',
} as const;

export const neutral = {
  black: '#0A0C0B',
  ink: '#12150F',
  ink2: '#3A3F3C',
  mute: '#636966',
  faint: '#7C8380',
  line: '#E1E4E3',
  line2: '#EDEFEE',
  grey50: '#F7F8F8',
  grey100: '#F1F3F2',
  grey200: '#E7EAE9',
  grey300: '#D6DAD9',
  white: '#FFFFFF',
} as const;

export const font = {
  display: "'Inter Tight', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
} as const;

/** The iOS spring. Every press, every thumb slide. */
export const easeIos = 'cubic-bezier(0.32, 0.72, 0, 1)';

/**
 * Ordered series colours, darkest first.
 * Use in this order so the most important series is the darkest.
 * There is no second hue — if you need more than 5 series, use opacity.
 */
export const series = [
  forest[700],
  forest[600],
  forest[400],
  forest[300],
  forest[100],
] as const;

export const tokens = { forest, neutral, font, easeIos, series } as const;
export default tokens;
