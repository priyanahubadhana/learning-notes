import { isBoolean } from '../app/uiPrefs'
import { memStore, prefStore } from '../app/tools/store'

/**
 * The first-run welcome (polish 2, item 1), the part that is in the first
 * download: only these flags. The sheet itself (Welcome.tsx) is lazy.
 *
 * - `pending` is set once, on the very first start of a device (no device mode
 *   saved yet). An existing user never has it, so an update never greets them.
 * - `done` is set when the welcome is finished or skipped; it never shows again.
 */
export const onboardingPending = prefStore(
  'onboarding.pending',
  isBoolean,
  false,
)
export const onboardingDone = prefStore('onboarding.done', isBoolean, false)

/** True while the welcome should open at start. */
export const welcomeNeeded = (): boolean =>
  onboardingPending.get() && !onboardingDone.get()

/** Settings › Show the welcome again. */
export const welcomeOpen = memStore(false)

/**
 * Fix #1 A: the first screen of the welcome asks "Sign in with Google" or
 * "Use without an account". `accountAsked` is set once it was answered.
 * The guide flag (`onboardingGuide`) is in app/signInGuideState.ts.
 */
export const onboardingAccountAsked = prefStore(
  'onboarding.accountAsked',
  isBoolean,
  false,
)
