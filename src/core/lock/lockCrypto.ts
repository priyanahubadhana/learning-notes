import { fromBase64, toBase64 } from '../base64'

/**
 * Hashing of PINs and passwords for the privacy lock. Only a salted PBKDF2
 * (SHA-256) hash is ever stored; the PIN or password itself never is.
 * This is a privacy lock, not encryption: the notes themselves are not
 * scrambled, so it stops casual eyes, not an expert with the device.
 */

/** One stored secret: random salt, hash and the number of rounds used. */
export interface SecretHash {
  salt: string
  hash: string
  iterations: number
  /** How many characters the code had when it was set (only newer codes have it). */
  len?: number
}

/**
 * Rounds of PBKDF2. A balance for slow phones: a 4–6 digit PIN is weak
 * whatever the rounds, which is one more reason this is a privacy lock only.
 */
const DEFAULT_ITERATIONS = 210_000

const PIN_PATTERN = /^\d{4,6}$/
export const PASSWORD_MIN = 6
/** Suggested length when sync is on (the hash then travels with the settings). */
export const PASSWORD_RECOMMENDED = 12
const PASSWORD_MAX = 128

/** A NEW PIN (set or change): exactly 6 digits. */
export const isNewPin = (value: string): boolean => /^[0-9]{6}$/.test(value)
/** A PIN that may already be stored (unlock only): 4 to 6 digits. */
export const isStoredPin = (value: string): boolean => PIN_PATTERN.test(value)
/** Shortest NEW lock password. */
export const NEW_PASSWORD_MIN = 8
/** A NEW lock password (set or change): 8 to 128 characters. */
export const isNewPassword = (value: string): boolean =>
  value.length >= NEW_PASSWORD_MIN && value.length <= PASSWORD_MAX

/** The saved length of a code, or undefined for an older code that has none. */
export function storedLength(hash: SecretHash | undefined): number | undefined {
  const n = hash?.len
  return Number.isInteger(n) &&
    (n as number) > 0 &&
    (n as number) <= PASSWORD_MAX
    ? n
    : undefined
}

export const isPin = (value: string): boolean => PIN_PATTERN.test(value)
export const isPassword = (value: string): boolean =>
  value.length >= PASSWORD_MIN && value.length <= PASSWORD_MAX

async function derive(
  secret: string,
  salt: Uint8Array,
  iterations: number,
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: salt as BufferSource,
      iterations,
    },
    key,
    256,
  )
}

export async function hashSecret(
  secret: string,
  iterations: number = DEFAULT_ITERATIONS,
): Promise<SecretHash> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return {
    salt: toBase64(salt.buffer as ArrayBuffer),
    hash: toBase64(await derive(secret, salt, iterations)),
    iterations,
  }
}

/** True when `secret` matches the stored hash (compared in constant time). */
export async function verifySecret(
  secret: string,
  stored: SecretHash,
): Promise<boolean> {
  const salt = new Uint8Array(fromBase64(stored.salt))
  const got = new Uint8Array(await derive(secret, salt, stored.iterations))
  const want = new Uint8Array(fromBase64(stored.hash))
  if (got.length !== want.length) return false
  let diff = 0
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i]
  return diff === 0
}

/** A value read from storage or a file is a well-formed hash. */
export function isSecretHash(value: unknown): value is SecretHash {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.salt === 'string' &&
    typeof v.hash === 'string' &&
    v.salt.length > 0 &&
    v.salt.length <= 64 &&
    v.hash.length > 0 &&
    v.hash.length <= 128 &&
    Number.isInteger(v.iterations) &&
    (v.iterations as number) >= 1_000 &&
    (v.iterations as number) <= 10_000_000
  )
}
