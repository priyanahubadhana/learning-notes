import type { JsonValue } from '../../core/types'
import { isProFeatureId, setLevel, setUnlocked, type Level } from '../level'
import { isExperience, setExperience, setExperienceOnTop } from './experience'

/**
 * Things Settings v3 changes that are not registry rows (the app view, the
 * experience, the Professional switches). They go through the same Undo /
 * Redo history under their own ids.
 */
export const LEVEL_ID = 'v3:level'
export const EXPERIENCE_ID = 'v3:experience'
export const EXPERIENCE_TOP_ID = 'v3:experienceTop'
export const UNLOCK_PREFIX = 'v3:unlock:'
/** Many switches in one step: the value is the list of switches that are on. */
export const unlockId = (id: string) => UNLOCK_PREFIX + id

/** Writes one such value; false when the id is an ordinary setting. */
export function writeVirtual(id: string, value: JsonValue): boolean {
  if (id === LEVEL_ID) {
    setLevel(value as Level)
    return true
  }
  if (id === EXPERIENCE_ID) {
    setExperience(isExperience(value) ? value : null)
    return true
  }
  if (id === EXPERIENCE_TOP_ID) {
    setExperienceOnTop(value !== false)
    return true
  }
  if (id.startsWith(UNLOCK_PREFIX)) {
    const feature = id.slice(UNLOCK_PREFIX.length)
    if (isProFeatureId(feature)) setUnlocked(feature, value === true)
    return true
  }
  return false
}
