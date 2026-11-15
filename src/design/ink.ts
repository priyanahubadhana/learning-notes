/**
 * The default ink follows the page (toolbar v9, task 2A.5). The saved colour
 * stays the plain default black; only what is drawn on screen is resolved,
 * through the `--ink-auto` token (dark in day and sepia, light at night).
 * Stored strokes and settings are never rewritten.
 */
export const DEFAULT_INK = '#1d1d1f'
export const INK_AUTO = 'var(--ink-auto)'

/** The colour to paint on screen for a saved pen colour. */
export const displayInk = (hex: string): string =>
  hex.toLowerCase() === DEFAULT_INK ? INK_AUTO : hex
