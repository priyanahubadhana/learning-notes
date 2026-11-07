/**
 * Day / Night / Sepia themes. Colours live in src/index.css as CSS
 * variables per `data-theme`; this file holds the logic.
 *
 * The saved choice is also read by a tiny script in index.html before the
 * app loads (no flash of the wrong theme). Keep the key and values in sync.
 */

export const THEMES = ['day', 'night', 'sepia'] as const
export type Theme = (typeof THEMES)[number]

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

/** Colours of the preview swatch in the theme list (page, text, accent). */
export const THEME_SWATCH: Record<
  Theme,
  { page: string; ink: string; accent: string }
> = {
  day: { page: '#ffffff', ink: '#1d1d1f', accent: '#2f6feb' },
  night: { page: '#161618', ink: '#ececee', accent: '#5e9bff' },
  sepia: { page: '#f8f1e3', ink: '#433422', accent: '#b5762a' },
}
