/**
 * "Edit in Summary" (slice 15, ST9): the Revise tab asks to open a page on
 * its Summary tab with the cursor in "In your own words". The page reads the
 * request once when it opens.
 */
let pending: string | null = null

export const requestSummaryField = (pageId: string) => {
  pending = pageId
}
export const peekSummaryField = (pageId: string) => pending === pageId
export const takeSummaryField = (pageId: string) => {
  const hit = pending === pageId
  if (hit) pending = null
  return hit
}
