/**
 * The few review counts the always-on shell needs (sidebar badge, page
 * tabs, search filters). The review code itself (and the FSRS scheduler
 * library) is fetched on the first call, not with the first download.
 */
type Review = typeof import('./reviewService')

const review = (): Promise<Review> => import('./reviewService')

export const countDue = (...a: Parameters<Review['countDue']>) =>
  review().then((m) => m.countDue(...a))

export const scopeCounts = (...a: Parameters<Review['scopeCounts']>) =>
  review().then((m) => m.scopeCounts(...a))

export const failCounts = (...a: Parameters<Review['failCounts']>) =>
  review().then((m) => m.failCounts(...a))

export const wrongCardIds = (...a: Parameters<Review['wrongCardIds']>) =>
  review().then((m) => m.wrongCardIds(...a))

export const dueByNotebook = (...a: Parameters<Review['dueByNotebook']>) =>
  review().then((m) => m.dueByNotebook(...a))
