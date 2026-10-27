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
    throw new DecryptError('This is not a password-protected file.')
  }
  const header = file.subarray(0, HEADER_BYTES)
  const rounds = new DataView(file.buffer, file.byteOffset).getUint32(
    MAGIC.length,
  )
  // A damaged number must not make opening take forever.
  if (rounds < MIN_ROUNDS || rounds > MAX_ROUNDS) {
    throw new DecryptError('This file is damaged.')
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
    throw new DecryptError(
      'Wrong password, or the file is damaged. Nothing was imported.',
    )
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
  return isEncryptedFile(
    new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer()),
  )
}
