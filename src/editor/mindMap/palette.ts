import type { MindTheme } from './model'

/**
 * Colours of the three mind map themes. `css` values use the app's colour
 * variables (so Day, Night and Sepia all work); `hex` values are used when
 * the map is drawn as a picture.
 */

/** Branch colours for the Bold and Paper themes. */
export const BRANCH_COLOURS = [
  '#e5484d',
  '#d9822b',
  '#2f9e6f',
  '#3e63dd',
  '#8e4ec6',
  '#12a594',
]

export interface NodeLook {
  background: string
  border: string
  colour: string
  borderWidth: number
  dashed?: boolean
}

/** The look of a node (`branch` is -1 for the centre). */
export function nodeLook(theme: MindTheme, branch: number): NodeLook {
  const hue = BRANCH_COLOURS[Math.max(0, branch) % BRANCH_COLOURS.length]
  if (theme === 'bold') {
    return branch < 0
      ? {
          background: 'var(--color-ink)',
          border: 'var(--color-ink)',
          colour: 'var(--color-bg)',
          borderWidth: 1,
        }
      : { background: hue, border: hue, colour: '#ffffff', borderWidth: 1 }
  }
  if (theme === 'paper') {
    return {
      background: 'transparent',
      border: branch < 0 ? 'var(--color-ink)' : hue,
      colour: 'var(--color-ink)',
      borderWidth: 2,
      dashed: branch >= 0,
    }
  }
  return branch < 0
    ? {
        background: 'var(--color-accent)',
        border: 'var(--color-accent)',
        colour: '#ffffff',
        borderWidth: 1,
      }
    : {
        background: 'var(--color-soft)',
        border: 'var(--color-line)',
        colour: 'var(--color-ink)',
        borderWidth: 1,
      }
}

/** The colour of the line into a node. */
export function lineColour(theme: MindTheme, branch: number): string {
  return theme === 'calm'
    ? 'var(--color-muted)'
    : BRANCH_COLOURS[Math.max(0, branch) % BRANCH_COLOURS.length]
}

/** Replaces `var(--x)` with the page's real colour (for drawing a picture). */
export function resolveColour(value: string, root: HTMLElement): string {
  const m = /^var\((--[\w-]+)\)$/.exec(value)
  if (!m) return value
  return getComputedStyle(root).getPropertyValue(m[1]).trim() || '#888888'
}
