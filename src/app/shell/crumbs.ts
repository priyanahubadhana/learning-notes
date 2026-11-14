import type { Space } from '../spaces/spaces'

export interface Crumb {
  label: string
  /** An earlier crumb is a button that goes to this space. */
  space?: Space
}

/**
 * The breadcrumbs of the top bar (spec 3.4): the space first (a button),
 * then where you are. The last crumb is plain text and truncates with "…".
 * A screen without a name of its own shows just the space as plain text.
 */
export function crumbsFor(
  space: Space,
  spaceName: string,
  title: string | null,
  /** A page or book is open: it puts its own path in the bar after the space. */
  deeper = false,
): Crumb[] {
  const name = title?.trim()
  if (!name || name === spaceName)
    return [deeper ? { label: spaceName, space } : { label: spaceName }]
  return [{ label: spaceName, space }, { label: name }]
}
