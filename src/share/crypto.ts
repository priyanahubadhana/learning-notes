import { t } from '../i18n/t'
/**
 * Password protection for saved files (Phase 6). The file's bytes are
 * encrypted with AES-GCM; the key comes from the password with PBKDF2
 * (SHA-256, many rounds, random salt). Nothing leaves the device and the
 * password is never stored: a forgotten password cannot be recovered.
 *
 * File layout: "LNOTESE1" (8 bytes) · rounds (4, big-endian) · salt (16)
 * · IV (12) · encrypted bytes (with the GCM check value at the end). The
 * first 40 bytes are also covered by the check, so they cannot be changed.
 */

const MAGIC = new TextEncoder().encode('LNOTESE1')
const HEADER_BYTES = MAGIC.length + 4 + 16 + 12
export const PBKDF2_ROUNDS = 600_000
const MIN_ROUNDS = 100_000
const MAX_ROUNDS = 5_000_000
export const MIN_PASSWORD_LENGTH = 8

/** The password is wrong, or the file was changed or damaged. */
export class DecryptError extends Error {}
/** The password does not open the file (or the file was changed). */
export class WrongPasswordError extends DecryptError {}

const subtle = () => globalThis.crypto.subtle

/** True if the bytes start like an encrypted file. */
export function isEncryptedFile(bytes: Uint8Array): boolean {
  return (
    bytes.length >= HEADER_BYTES &&
    MAGIC.every((value, i) => bytes[i] === value)
  )
}

async function keyFor(
  password: string,
  salt: Uint8Array,
  rounds: number,
  usage: KeyUsage,
): Promise<CryptoKey> {
  const material = await subtle().importKey(
    'raw',
    new TextEncoder().encode(password.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return subtle().deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: salt as BufferSource,
      iterations: rounds,
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage],
  )
}

/** The plain bytes, locked with the password. */
export async function encryptBytes(
  plain: Uint8Array,
  password: string,
  rounds: number = PBKDF2_ROUNDS,
): Promise<Uint8Array> {
  const header = new Uint8Array(HEADER_BYTES)
  header.set(MAGIC)
  new DataView(header.buffer).setUint32(MAGIC.length, rounds)
  globalThis.crypto.getRandomValues(header.subarray(MAGIC.length + 4))
  const salt = header.subarray(MAGIC.length + 4, MAGIC.length + 20)
  const iv = header.subarray(MAGIC.length + 20)
  const key = await keyFor(password, salt, rounds, 'encrypt')
  const locked = new Uint8Array(
    await subtle().encrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
        additionalData: header as BufferSource,
      },
      key,
      plain as BufferSource,
    ),
  )
  const out = new Uint8Array(header.length + locked.length)
  out.set(header)
  out.set(locked, header.length)
  return out
}

/** The bytes that were locked. Throws `DecryptError` for a wrong password. */
export async function decryptBytes(
  file: Uint8Array,
  password: string,
): Promise<Uint8Array> {
  if (!isEncryptedFile(file)) {
    throw new DecryptError(t('err.notLocked'))
  }
  const header = file.subarray(0, HEADER_BYTES)
  const rounds = new DataView(file.buffer, file.byteOffset).getUint32(
    MAGIC.length,
  )
  // A damaged number must not make opening take forever.
  if (rounds < MIN_ROUNDS || rounds > MAX_ROUNDS) {
    throw new DecryptError(t('err.fileDamaged'))
  }
  const salt = header.subarray(MAGIC.length + 4, MAGIC.length + 20)
  const iv = header.subarray(MAGIC.length + 20)
  const key = await keyFor(password, salt, rounds, 'decrypt')
  try {
    return new Uint8Array(
      await subtle().decrypt(
        {
          name: 'AES-GCM',
          iv: iv as BufferSource,
          additionalData: header as BufferSource,
        },
        key,
        file.subarray(HEADER_BYTES) as BufferSource,
      ),
    )
  } catch {
    throw new WrongPasswordError(t('err.wrongPassword'))
  }
}

/** Locks a file's Blob. */
export async function encryptBlob(blob: Blob, password: string): Promise<Blob> {
  const bytes = await encryptBytes(
    new Uint8Array(await blob.arrayBuffer()),
    password,
  )
  return new Blob([bytes as BlobPart], { type: 'application/octet-stream' })
}

/** The first bytes of a file (to tell whether it is locked). */
export async function peekIsEncrypted(file: Blob): Promise<boolean> {
  if (isChunkedEncrypted(new Uint8Array(await file.slice(0, 64).arrayBuffer())))
    return true
  return isEncryptedFile(
    new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer()),
  )
}

// ---------------------------------------------------------------- big files

/**
 * Big files (the zip format, up to about 1 GB) are locked in chunks so no
 * single giant buffer is needed. Same key, same parameters as above.
 *
 * Layout: "LNOTESE2" (8) · rounds (4) · salt (16) · base IV (12) · chunk
 * size (4) · then chunks, each the encrypted bytes of `chunk size` plain
 * bytes plus a 16-byte check (the last chunk may be shorter). A chunk's IV is
 * the base IV with its number mixed into the last 4 bytes, and its check
 * also covers the header, the chunk number and whether it is the last one,
 * so chunks cannot be reordered, dropped or cut off unnoticed.
 */
const MAGIC2 = new TextEncoder().encode('LNOTESE2')
const HEADER2_BYTES = MAGIC2.length + 4 + 16 + 12 + 4
const TAG_BYTES = 16
export const CHUNK_BYTES = 1024 * 1024
const MIN_CHUNK = 16
const MAX_CHUNK = 16 * 1024 * 1024

/** True if the bytes start like a chunked locked file. */
export function isChunkedEncrypted(bytes: Uint8Array): boolean {
  return (
    bytes.length >= HEADER2_BYTES &&
    MAGIC2.every((value, i) => bytes[i] === value)
  )
}

function chunkIv(base: Uint8Array, index: number): Uint8Array {
  const iv = base.slice()
  const view = new DataView(iv.buffer)
  view.setUint32(8, (view.getUint32(8) ^ index) >>> 0)
  return iv
}

function chunkAad(
  header: Uint8Array,
  index: number,
  final: boolean,
): Uint8Array {
  const aad = new Uint8Array(header.length + 5)
  aad.set(header)
  new DataView(aad.buffer).setUint32(header.length, index)
  aad[header.length + 4] = final ? 1 : 0
  return aad
}

/** Locks a big file's Blob in chunks. */
export async function encryptBlobChunked(
  blob: Blob,
  password: string,
  rounds: number = PBKDF2_ROUNDS,
  chunk: number = CHUNK_BYTES,
): Promise<Blob> {
  const header = new Uint8Array(HEADER2_BYTES)
  header.set(MAGIC2)
  const view = new DataView(header.buffer)
  view.setUint32(MAGIC2.length, rounds)
  globalThis.crypto.getRandomValues(
    header.subarray(MAGIC2.length + 4, MAGIC2.length + 32),
  )
  view.setUint32(MAGIC2.length + 32, chunk)
  const salt = header.subarray(MAGIC2.length + 4, MAGIC2.length + 20)
  const baseIv = header.subarray(MAGIC2.length + 20, MAGIC2.length + 32)
  const key = await keyFor(password, salt, rounds, 'encrypt')
  const parts: BlobPart[] = [header as BlobPart]
  for (let index = 0, offset = 0; ; index++, offset += chunk) {
    const final = offset + chunk >= blob.size
    const plain = new Uint8Array(
      await blob.slice(offset, offset + chunk).arrayBuffer(),
    )
    const locked = await subtle().encrypt(
      {
        name: 'AES-GCM',
        iv: chunkIv(baseIv, index) as BufferSource,
        additionalData: chunkAad(header, index, final) as BufferSource,
      },
      key,
      plain as BufferSource,
    )
    parts.push(locked)
    if (final) break
  }
  return new Blob(parts, { type: 'application/octet-stream' })
}

/** The Blob that was locked by `encryptBlobChunked`. Throws `DecryptError`. */
export async function decryptBlobChunked(
  file: Blob,
  password: string,
): Promise<Blob> {
  const header = new Uint8Array(
    await file.slice(0, HEADER2_BYTES).arrayBuffer(),
  )
  if (!isChunkedEncrypted(header)) throw new DecryptError(t('err.notLocked'))
  const view = new DataView(header.buffer)
  const rounds = view.getUint32(MAGIC2.length)
  const chunk = view.getUint32(MAGIC2.length + 32)
  if (
    rounds < MIN_ROUNDS ||
    rounds > MAX_ROUNDS ||
    chunk < MIN_CHUNK ||
    chunk > MAX_CHUNK ||
    file.size < HEADER2_BYTES + TAG_BYTES
  ) {
    throw new DecryptError(t('err.fileDamaged'))
  }
  const salt = header.subarray(MAGIC2.length + 4, MAGIC2.length + 20)
  const baseIv = header.subarray(MAGIC2.length + 20, MAGIC2.length + 32)
  const key = await keyFor(password, salt, rounds, 'decrypt')
  const parts: BlobPart[] = []
  let offset = HEADER2_BYTES
  for (let index = 0; offset < file.size; index++) {
    const length = Math.min(chunk + TAG_BYTES, file.size - offset)
    const final = offset + length >= file.size
    if (length < TAG_BYTES) throw new DecryptError(t('err.fileDamaged'))
    const locked = new Uint8Array(
      await file.slice(offset, offset + length).arrayBuffer(),
    )
    try {
      parts.push(
        await subtle().decrypt(
          {
            name: 'AES-GCM',
            iv: chunkIv(baseIv, index) as BufferSource,
            additionalData: chunkAad(header, index, final) as BufferSource,
          },
          key,
          locked as BufferSource,
        ),
      )
    } catch {
      throw new WrongPasswordError(t('err.wrongPassword'))
    }
    offset += length
  }
  return new Blob(parts, { type: 'application/zip' })
}
