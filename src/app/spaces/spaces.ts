import type { Route } from '../router'

/**
 * The four spaces of the app (redesign step 4a). A space decides what the
 * sidebar lists; the pages, notebooks and every address stay the same.
 */
export const SPACES = ['home', 'library', 'notebooks', 'review'] as const
export type Space = (typeof SPACES)[number]

export const isSpace = (value: unknown): value is Space =>
  typeof value === 'string' && (SPACES as readonly string[]).includes(value)

/** Spaces the owner may hide in Settings. Notebooks always stays. */
export const HIDEABLE_SPACES: readonly Space[] = ['home', 'library', 'review']

/** The icon (emoji) of each space. */
export const SPACE_ICON: Record<Space, string> = {
  home: '🏠',
  library: '📚',
  notebooks: '📓',
  review: '🧠',
}

/**
 * The space an address belongs to, or null when it can stay where it is
 * (Settings, Save & restore, a search, the empty home address).
 */
export function spaceForRoute(route: Route): Space | null {
  switch (route.kind) {
    case 'review':
    case 'cards':
      return 'review'
    case 'search':
      return route.savedId ? 'review' : null
    case 'capture':
      return 'library'
    case 'page':
    case 'notebook':
    case 'database':
    case 'databases':
    case 'calendar':
      return 'notebooks'
    default:
      return null
  }
}

/** The spaces shown in the strip, in order, without the hidden ones. */
export const visibleSpaces = (hidden: readonly Space[]): Space[] =>
  SPACES.filter((s) => s === 'notebooks' || !hidden.includes(s))

/** `wanted`, or Notebooks when that space is hidden. */
export const usableSpace = (wanted: Space, hidden: readonly Space[]): Space =>
  visibleSpaces(hidden).includes(wanted) ? wanted : 'notebooks'
