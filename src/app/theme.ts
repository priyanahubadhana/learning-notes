/**
 * Day / Night / Sepia themes. Colours live in src/index.css as CSS
 * variables per `data-theme`; this file holds the logic.
 *
 * The saved choice is also read by a tiny script in index.html before the
 * app loads (no flash of the wrong theme). Keep the key and values in sync.
 */

export const THEMES = ['day', 'night', 'sepia'] as const
export type Theme = (typeof THEMES)[number]

export const THEME_LABELS: Record<Theme, string> = {
  day: 'Day',
  night: 'Night',
  sepia: 'Sepia',
}

/** Preference key (stored as "learning-notes:theme"; see uiPrefs.ts). */
export const THEME_PREF_KEY = 'theme'

export const isTheme = (value: unknown): value is Theme =>
  typeof value === 'string' && (THEMES as readonly string[]).includes(value)

/** Light or dark base for the editor (Sepia is a light theme). */
export function editorColorScheme(theme: Theme): 'light' | 'dark' {
  return theme === 'night' ? 'dark' : 'light'
}

/** Applies a theme to the page (CSS reads `data-theme` on <html>). */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}
