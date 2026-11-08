import { isBoolean } from './uiPrefs'
import { prefStore } from './tools/store'

/**
 * On while the step-by-step sign-in sheets (passphrase, recovery code,
 * unlock) are open on a fresh device; the welcome waits until they are done.
 * Shared code, so the welcome (onboarding) and sync both use it without
 * linking to each other.
 */
export const onboardingGuide = prefStore('onboarding.guide', isBoolean, false)
