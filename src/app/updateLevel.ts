/**
 * What makes an update "must-have" (slice 10, flag `update.v2`).
 *
 * Every build carries a whole number, UPDATE_LEVEL. The live /version.json
 * publishes the level of the newest build. A device treats a newer version as
 * must-have exactly when the live level is higher than the level it was built
 * with. Missing, text, fractional or negative levels mean "not must-have".
 *
 * Raise UPDATE_LEVEL by 1 when, and only when:
 *  - storage: the highest `this.version(n)` in src/core/db.ts changes (or a
 *    stored record shape changes in a way old code would misread);
 *  - datafix: the release contains a migration that repairs saved data.
 * The unit test pins DB_LEVEL_PIN, so changing the Dexie version without
 * adding it here (with the new level) fails the build.
 */
export const UPDATE_LEVEL = 1

export type UpdateReason = 'storage' | 'datafix'

/** Why the newest level was raised in this build (shown on the notice). */
export const UPDATE_REASON: UpdateReason = 'storage'

/** Database version -> the level that introduced it. Keep in step with db.ts. */
export const DB_LEVEL_PIN: Readonly<Record<number, number>> = { 23: 1 }

/** The level written in a version.json, or null when it is not a valid one. */
export function parseLevel(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null
}

/** True when the live level is higher than the level this build has. */
export function isMustHaveLevel(
  live: unknown,
  mine: number = UPDATE_LEVEL,
): boolean {
  const level = parseLevel(live)
  return level !== null && level > mine
}

/** The reason in a version.json; anything unknown counts as storage. */
export function parseReason(value: unknown): UpdateReason {
  return value === 'datafix' ? 'datafix' : 'storage'
}
