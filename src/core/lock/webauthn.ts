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

export type PasskeyResult = 'ok' | 'cancelled' | 'unavailable' | 'failed'

const failure = (error: unknown): PasskeyResult =>
  error instanceof DOMException && error.name === 'NotAllowedError'
    ? 'cancelled'
    : 'failed'

/** Makes the device passkey (asks Face ID / Touch ID / Windows Hello). */
export async function createPasskey(): Promise<PasskeyResult> {
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
    return failure(error)
  }
}

/** Asks the device to verify you with the saved passkey. */
export async function verifyWithPasskey(): Promise<PasskeyResult> {
  const id = getCredentialId()
  if (!id) return 'unavailable'
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
    return failure(error)
  }
}
