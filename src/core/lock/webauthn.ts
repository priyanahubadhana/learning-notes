import { readPref, writePref } from '../../app/uiPrefs'
import { fromBase64, toBase64 } from '../base64'

/**
 * Face ID, Touch ID and Windows Hello through a WebAuthn platform passkey.
 * A passkey is created on this device with `userVerification: 'required'`
 * (the device checks your face, finger or PIN). Only its credential id is
 * kept here, on this device. Unlocking asks the device to verify you again
 * and accepts a successful answer. The answer is not checked against a server
 * (there is none); this is a privacy lock, not a security boundary.
 */

const KEY = 'lock.credentialId'
const isId = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= 1024

export const getCredentialId = (): string => readPref(KEY, isId, '')
export const hasPasskey = (): boolean => getCredentialId() !== ''
export const forgetPasskey = (): void => writePref(KEY, '')

/** Can this browser make a platform passkey at all? */
export async function passkeyAvailable(): Promise<boolean> {
  try {
    if (!window.isSecureContext || !('credentials' in navigator)) return false
    if (typeof PublicKeyCredential === 'undefined') return false
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

const random = (n: number) => crypto.getRandomValues(new Uint8Array(n))

export type PasskeyResult =
  | 'ok'
  | 'cancelled'
  | 'unavailable'
  | 'failed'
  /** Refused at once, before any sheet showed (e.g. iCloud Keychain is off). */
  | 'refused'
  /** No passkey for this app on this device (removed, or never made here). */
  | 'notSetUp'
  /** This browser or address cannot use the device lock. */
  | 'unsupported'

/** Under this many ms, a refusal came before a sheet could have shown. */
export const REFUSED_BEFORE_SHEET_MS = 100

/** Maps a WebAuthn error name and the time it took to a plain cause (tested). */
export function passkeyFailure(name: string, ms: number): PasskeyResult {
  if (name === 'NotAllowedError') {
    return ms < REFUSED_BEFORE_SHEET_MS ? 'refused' : 'cancelled'
  }
  if (name === 'InvalidStateError' || name === 'NotFoundError')
    return 'notSetUp'
  if (name === 'NotSupportedError' || name === 'SecurityError') {
    return 'unsupported'
  }
  return 'failed'
}

/** The text key for why the device lock did not confirm. */
export function passkeyMessageKey(
  result: PasskeyResult | null,
):
  | 'lock.deviceFailed'
  | 'lock.device.cancelled'
  | 'lock.device.notSetUp'
  | 'lock.device.refused'
  | 'lock.device.unsupported' {
  switch (result) {
    case 'cancelled':
      return 'lock.device.cancelled'
    case 'notSetUp':
      return 'lock.device.notSetUp'
    case 'refused':
      return 'lock.device.refused'
    case 'unsupported':
    case 'unavailable':
      return 'lock.device.unsupported'
    default:
      return 'lock.deviceFailed'
  }
}

const failure = (error: unknown, startedAt: number): PasskeyResult => {
  const name = error instanceof DOMException ? error.name : 'Error'
  const ms = Math.round(performance.now() - startedAt)
  // Kept for finding out why a real iPad refuses (no secrets in it).
  console.debug('[lock] device lock failed', name, ms, 'ms')
  return passkeyFailure(name, ms)
}

/** Makes the device passkey (asks Face ID / Touch ID / Windows Hello). */
export async function createPasskey(): Promise<PasskeyResult> {
  const startedAt = performance.now()
  try {
    if (!(await passkeyAvailable())) return 'unavailable'
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: random(32),
        rp: { name: 'Learning Notes' },
        user: {
          id: random(16),
          name: 'learning-notes-lock',
          displayName: 'Learning Notes lock',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged',
        },
        timeout: 60_000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null
    if (!credential) return 'failed'
    writePref(KEY, toBase64(credential.rawId))
    return 'ok'
  } catch (error) {
    return failure(error, startedAt)
  }
}

/** Asks the device to verify you with the saved passkey. */
export async function verifyWithPasskey(): Promise<PasskeyResult> {
  const id = getCredentialId()
  if (!id) return 'notSetUp'
  // No `await` before the call below: Safari only shows Face ID while the
  // call still belongs to the tap.
  const startedAt = performance.now()
  try {
    const result = await navigator.credentials.get({
      publicKey: {
        challenge: random(32),
        allowCredentials: [
          { type: 'public-key', id: fromBase64(id), transports: ['internal'] },
        ],
        userVerification: 'required',
        timeout: 60_000,
      },
    })
    return result ? 'ok' : 'failed'
  } catch (error) {
    return failure(error, startedAt)
  }
}
