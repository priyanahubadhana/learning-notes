import { t } from '../i18n/t'
import {
  BundleError,
  MAX_BUNDLE_BYTES,
  readAnyFile,
  type Bundle,
} from './bundle'
import {
  DecryptError,
  WrongPasswordError,
  decryptBytes,
  encryptBlob,
  isEncryptedFile,
} from './crypto'

/** The file is password protected and no password was given. */
export class PasswordNeeded extends Error {}

/** The password given does not open the protected file. */
export class WrongPassword extends BundleError {}

/** Ending of a password-protected file. */
export const LOCKED_EXTENSION = '.learningnotes.locked'

/** The file name of a protected copy: "X.learningnotes.json" → "X.learningnotes.locked". */
export const lockedFileName = (name: string): string =>
  name.replace(/\.learningnotes\.json$/, '') + LOCKED_EXTENSION

/** The blob to save: locked with `password` if one is given. */
export async function fileToSave(blob: Blob, password?: string): Promise<Blob> {
  return password ? encryptBlob(blob, password) : blob
}

/**
 * Reads a chosen file as a bundle. A protected file needs its password:
 * without one this throws `PasswordNeeded`; a wrong one a `BundleError`.
 */
export async function readImportFile(
  file: Blob,
  password?: string,
): Promise<Bundle> {
  if (file.size > MAX_BUNDLE_BYTES) {
    throw new BundleError(t('err.tooBig'))
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!isEncryptedFile(bytes))
    return readAnyFile(new TextDecoder().decode(bytes))
  if (!password) throw new PasswordNeeded()
  try {
    return readAnyFile(
      new TextDecoder().decode(await decryptBytes(bytes, password)),
    )
  } catch (error) {
    if (error instanceof WrongPasswordError)
      throw new WrongPassword(error.message)
    if (error instanceof DecryptError) throw new BundleError(error.message)
    throw error
  }
}
