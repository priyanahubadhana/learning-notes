import type { Theme } from '../theme'

/** One tap flips Day and Night; from Sepia it goes to Night (spec 2). */
export const flipTheme = (theme: Theme): Theme =>
  theme === 'night' ? 'day' : 'night'

/** Sun when the screen is dark, moon when it is light. */
export const themeIcon = (theme: Theme): 'sun' | 'moon' =>
  theme === 'night' ? 'sun' : 'moon'
