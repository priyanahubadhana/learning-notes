/**
 * The few pieces of the app's end-to-end encryption (src/sync/crypto.ts) the
 * online connector needs, written with web-standard calls only so Deno runs
 * them. The app's file cannot be imported here (it needs the Argon2 package
 * and extension-less imports), so this is a SMALL COPY, kept honest by
 * `src/connector/parity.test.ts`: a record sealed here opens with the app's
 * code and the reverse, byte for byte the same rules.
 *
 * Also the escrow: the master key wrapped with a server secret.
 */

const enc = new TextEncoder()
const dec = new TextDecoder()
const subtle = () => globalThis.crypto.subtle

export class CryptoError extends Error {}

export function toBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(out)
}
export function fromBase64(text: string): Uint8Array {
  const binary = atob(text)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}
const concat = (a: Uint8Array, b: Uint8Array) => {
  const out = new Uint8Array(a.length + b.length)
  out.set(a)
  out.set(b, a.length)
  return out
}
const randomBytes = (n: number) =>
  globalThis.crypto.getRandomValues(new Uint8Array(n))

/** Same as `stableId` in src/core/ids.ts (matching only, not security). */
export function stableId(name: string): string {
  const bytes = enc.encode(name)
  const hash = (seed: bigint) => {
    let h = seed
    for (const byte of bytes) {
      h ^= BigInt(byte)
      h = (h * 0x100000001b3n) & 0xffffffffffffffffn
    }
    return h.toString(16).padStart(16, '0')
  }
  const hex = hash(0xcbf29ce484222325n) + hash(0x84222325cbf29ce4n)
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    '8' + hex.slice(13, 16),
    variant + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join('-')
}

/** The id the server sees for a record (src/sync/crypto.ts `remoteId`). */
export const remoteId = (table: string, id: string) =>
  stableId(`rec:${table}:${id}`)

const recordAad = (serverId: string, rev: number, keyId: string) =>
  `ln-rec|v1|${keyId}|${serverId}|${rev}`

export interface MasterKey {
  keyId: string
  key: CryptoKey
}
export interface SealedRecord {
  keyId: string
  data: string
}

export async function masterFromRaw(
  keyId: string,
  raw: Uint8Array,
): Promise<MasterKey> {
  if (raw.length !== 32) throw new CryptoError('Bad key length.')
  if (!/^[0-9a-f]{16}$/.test(keyId)) throw new CryptoError('Bad key id.')
  return {
    keyId,
    key: await subtle().importKey(
      'raw',
      raw as BufferSource,
      'AES-GCM',
      false,
      ['encrypt', 'decrypt'],
    ),
  }
}

export async function sealRecord(
  master: MasterKey,
  table: string,
  id: string,
  rev: number,
  value: unknown,
): Promise<SealedRecord> {
  const iv = randomBytes(12)
  const plain = enc.encode(JSON.stringify({ t: table, i: id, v: value }))
  const ct = await subtle().encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      additionalData: enc.encode(
        recordAad(remoteId(table, id), rev, master.keyId),
      ),
    },
    master.key,
    plain as BufferSource,
  )
  return { keyId: master.keyId, data: toBase64(concat(iv, new Uint8Array(ct))) }
}

export async function openRecord(
  master: MasterKey,
  serverId: string,
  rev: number,
  sealed: SealedRecord,
): Promise<{ table: string; id: string; value: unknown }> {
  if (sealed.keyId !== master.keyId)
    throw new CryptoError('Locked with another key.')
  const bytes = fromBase64(sealed.data)
  let plain: ArrayBuffer
  try {
    plain = await subtle().decrypt(
      {
        name: 'AES-GCM',
        iv: bytes.subarray(0, 12) as BufferSource,
        additionalData: enc.encode(recordAad(serverId, rev, master.keyId)),
      },
      master.key,
      bytes.subarray(12) as BufferSource,
    )
  } catch {
    throw new CryptoError('Could not open the locked data.')
  }
  const parsed = JSON.parse(dec.decode(plain)) as {
    t: string
    i: string
    v: unknown
  }
  if (remoteId(parsed.t, parsed.i) !== serverId)
    throw new CryptoError('Wrong record.')
  return { table: parsed.t, id: parsed.i, value: parsed.v }
}

// ---- The escrow: master key wrapped with a server secret ----

/** Shortest server secret we accept (the owner makes it with `openssl rand -base64 32`). */
export const MIN_SECRET_CHARS = 32

async function escrowKey(secret: string, userId: string): Promise<CryptoKey> {
  if (secret.length < MIN_SECRET_CHARS)
    throw new CryptoError('The server secret is too short.')
  const base = await subtle().importKey(
    'raw',
    enc.encode(secret) as BufferSource,
    'HKDF',
    false,
    ['deriveKey'],
  )
  return subtle().deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: enc.encode(userId) as BufferSource,
      info: enc.encode('ln-claude-escrow-v1'),
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}
const escrowAad = (userId: string, keyId: string) =>
  `ln-escrow|v1|${userId}|${keyId}`

/** Wraps the raw master key: base64 of IV then locked bytes. */
export async function wrapMasterKey(
  secret: string,
  userId: string,
  keyId: string,
  raw: Uint8Array,
): Promise<string> {
  if (raw.length !== 32) throw new CryptoError('Bad key length.')
  const iv = randomBytes(12)
  const ct = await subtle().encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      additionalData: enc.encode(escrowAad(userId, keyId)),
    },
    await escrowKey(secret, userId),
    raw as BufferSource,
  )
  return toBase64(concat(iv, new Uint8Array(ct)))
}

/** Opens the wrapped key into a non-extractable usable key (the raw bytes are dropped at once). */
export async function unwrapMasterKey(
  secret: string,
  userId: string,
  keyId: string,
  wrapped: string,
): Promise<MasterKey> {
  const bytes = fromBase64(wrapped)
  let raw: Uint8Array
  try {
    raw = new Uint8Array(
      await subtle().decrypt(
        {
          name: 'AES-GCM',
          iv: bytes.subarray(0, 12) as BufferSource,
          additionalData: enc.encode(escrowAad(userId, keyId)),
        },
        await escrowKey(secret, userId),
        bytes.subarray(12) as BufferSource,
      ),
    )
  } catch {
    throw new CryptoError('Could not open the wrapped key.')
  }
  try {
    return await masterFromRaw(keyId, raw)
  } finally {
    raw.fill(0)
  }
}
