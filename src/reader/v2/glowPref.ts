import { isBoolean } from '../../app/uiPrefs'

/**
 * "Highlight where I land" (slice 7e, RD-B30 to RD-B32). When on, a jump to a
 * highlight or bookmark makes the spot glow for 2 s. Only a jump causes it:
 * a Pencil or finger resting on the page never does. Stored on this device.
 *
 * Today's reader already glows on every jump, so people who had the reader
 * before keep exactly that (the switch starts ON for everyone and can be
 * turned off).
 */
export const GLOW_KEY = 'reader.glowOnLand'
export const GLOW_DEFAULT = true
export const isGlowPref = isBoolean

export const GLOW_MS = 2000
/** Reduced motion: no animation, a still outline for this long. */
export const GLOW_REDUCED_MS = 1600

export function prefersReducedMotion(): boolean {
  try {
    return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** How long the glow shows. */
export const glowMs = (reduced: boolean): number =>
  reduced ? GLOW_REDUCED_MS : GLOW_MS

/** The annotation to glow on a jump, or none when the switch is off. */
export const glowTarget = (id: string, on: boolean): string | undefined =>
  on ? id : undefined
