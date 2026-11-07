import type { LearningNotesDB } from '../core/db'
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
  decryptBlobChunked,
  decryptBytes,
  encryptBlob,
  encryptBlobChunked,
  isChunkedEncrypted,
  isEncryptedFile,
} from './crypto'
import { MAX_FULL_BYTES, type Manifest } from './fullFile'
import { isZip, readManifest } from './readFull'

/** The file is password protected and no password was given. */
export class PasswordNeeded extends Error {}

/** The password given does not open the protected file. */
export class WrongPassword extends BundleError {}

/** Ending of a password-protected file. */
const LOCKED_EXTENSION = '.learningnotes.locked'

/** The file name of a protected copy: "X.learningnotes.json" or ".zip" → "X.learningnotes.locked". */
export const lockedFileName = (name: string): string =>
  name.replace(/\.learningnotes\.(json|zip)$/, '') + LOCKED_EXTENSION

/** The blob to save: locked with `password` if one is given (in chunks for the big zip format). */
export async function fileToSave(
  blob: Blob,
  password?: string,
  chunked = false,
): Promise<Blob> {
  if (!password) return blob
  return chunked
    ? encryptBlobChunked(blob, password)
    : encryptBlob(blob, password)
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

// ------------------------------------------------------------ saved files

/** A chosen file, read as far as the restore dialog needs. */
export type SavedFile =
  | { type: 'json'; name: string; size: number; bundle: Bundle }
  | { type: 'zip'; name: string; size: number; blob: Blob; manifest: Manifest }

/**
 * Opens any saved file: the new zip, an old `.learningnotes.json`, either one
 * locked with a password (old whole-file lock or the chunked lock). Throws
 * `PasswordNeeded` / `WrongPassword` / `BundleError`. Nothing is written.
 */
export async function openSavedFile(
  file: File,
  db: LearningNotesDB,
  password?: string,
): Promise<SavedFile> {
  if (file.size > MAX_FULL_BYTES) throw new BundleError(t('err.tooBig'))
  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer())
  let plain: Blob = file
  try {
    if (isChunkedEncrypted(head)) {
      if (!password) throw new PasswordNeeded()
      plain = await decryptBlobChunked(file, password)
    } else if (isEncryptedFile(head)) {
      if (file.size > MAX_BUNDLE_BYTES) throw new BundleError(t('err.tooBig'))
      if (!password) throw new PasswordNeeded()
      plain = new Blob([
        (await decryptBytes(
          new Uint8Array(await file.arrayBuffer()),
          password,
        )) as BlobPart,
      ])
    }
  } catch (error) {
    if (error instanceof WrongPasswordError)
      throw new WrongPassword(error.message)
    if (error instanceof DecryptError) throw new BundleError(error.message)
    throw error
  }
  const start = new Uint8Array(await plain.slice(0, 8).arrayBuffer())
  if (isZip(start)) {
    const manifest = await readManifest(plain, db)
    return {
      type: 'zip',
      name: file.name,
      size: file.size,
      blob: plain,
      manifest,
    }
  }
  if (plain.size > MAX_BUNDLE_BYTES) throw new BundleError(t('err.tooBig'))
  const bundle = readAnyFile(await plain.text())
  return { type: 'json', name: file.name, size: file.size, bundle }
}
