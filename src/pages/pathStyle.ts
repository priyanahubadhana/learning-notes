/**
 * Page path (breadcrumb) styles in the top bar. "simple" is Notebook / Page,
 * "full" is a folder-like path with a sibling list at every arrow, "page" is
 * the page name alone (tap it for the full path). A page's own choice wins
 * over its notebook's, which wins over the default in Settings.
 */
export const PATH_STYLES = ['simple', 'full', 'page'] as const
export type PathStyle = (typeof PATH_STYLES)[number]

export const isPathStyle = (v: unknown): v is PathStyle =>
  (PATH_STYLES as readonly unknown[]).includes(v)

/** page override, else notebook override, else the global default. */
export function resolvePathStyle(
  page: unknown,
  notebook: unknown,
  fallback: PathStyle,
): PathStyle {
  if (isPathStyle(page)) return page
  if (isPathStyle(notebook)) return notebook
  return fallback
}

/** More parts than this collapse their middle into "…". */
export const MAX_PATH_PARTS = 4

export interface CollapsedPath<T> {
  /** Shown before the "…" (the first part). */
  head: T[]
  /** Hidden behind "…" (empty when nothing collapses). */
  hidden: T[]
  /** Shown after it (the last two parts). */
  tail: T[]
}

/** Keeps the first and the last two parts; the middle becomes "…". */
export function collapsePath<T>(
  parts: readonly T[],
  max: number = MAX_PATH_PARTS,
): CollapsedPath<T> {
  if (parts.length <= max) return { head: [...parts], hidden: [], tail: [] }
  return {
    head: parts.slice(0, 1),
    hidden: parts.slice(1, parts.length - 2),
    tail: parts.slice(parts.length - 2),
  }
}
