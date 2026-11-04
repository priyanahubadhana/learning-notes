import type { LearningNotesDB } from '../db'
import { isSecretHash, type SecretHash } from './lockCrypto'

/**
 * The lock's codes, kept in the `settings` table (so they are in backups, as
 * hashes only). The passkey (Face ID, Touch ID, Windows Hello) is NOT here:
 * its credential id stays on this device (see webauthn.ts).
 */

export const LOCK_CONFIG_ID = 'lock.config'

export interface LockConfig {
  pin?: SecretHash
  password?: SecretHash
}

/** Reads the stored config; anything malformed counts as "no code". */
export function parseLockConfig(value: unknown): LockConfig {
  if (typeof value !== 'object' || value === null) return {}
  const v = value as Record<string, unknown>
  return {
    ...(isSecretHash(v.pin) ? { pin: v.pin } : {}),
    ...(isSecretHash(v.password) ? { password: v.password } : {}),
  }
}

export async function getLockConfig(db: LearningNotesDB): Promise<LockConfig> {
  const row = await db.settings.get(LOCK_CONFIG_ID)
  return parseLockConfig(row?.value)
}

export async function saveLockConfig(
  db: LearningNotesDB,
  config: LockConfig,
  now: number = Date.now(),
): Promise<void> {
  await db.settings.put({
    id: LOCK_CONFIG_ID,
    value: parseLockConfig(config) as never,
    updatedAt: now,
  })
}

/** Which ways to unlock exist (the passkey is per device). */
export interface LockMethods {
  pin: boolean
  password: boolean
  passkey: boolean
}

export const methodsOf = (
  config: LockConfig,
  hasPasskey: boolean,
): LockMethods => ({
  pin: !!config.pin,
  password: !!config.password,
  passkey: hasPasskey,
})

/** The lock does anything only when at least one way to unlock is set up. */
export const lockIsSetUp = (m: LockMethods): boolean =>
  m.pin || m.password || m.passkey
