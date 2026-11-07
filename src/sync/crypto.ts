import { argon2id } from 'hash-wasm'
import * as b64 from '../core/base64'
import { stableId } from '../core/ids'

const toBase64 = (bytes: Uint8Array) =>
  b64.toBase64(
    bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer,
  )
const fromBase64 = (text: string) => new Uint8Array(b64.fromBase64(text))

/**
 * End-to-end encryption for sync (L5). Design (RESEARCH.md, "Encryption"):
 *
 * - One random 256-bit **master key** locks every synced record and file.
 *   It is made on the first device and never leaves a device unlocked.
 * - Each way to unlock locks a copy of the master key separately (a "key
 *   bundle"): the **passphrase** (Argon2id, 64 MiB, t=3, p=1) and the printed
 *   **recovery code** (128 random bits, HKDF). Changing the passphrase
 *   re-locks the key only; no note is touched.
 * - Records use AES-256-GCM with a fresh 96-bit IV each time. The record's
 *   table, id, revision and the key id are bound in as extra checked data
 *   (AAD), so the server cannot swap one record for another or replay an old
 *   copy under a newer revision.
 *
 * Nothing here falls back silently: any failure throws.
 */

export const ARGON = { memoryKiB: 64 * 1024, iterations: 3, parallelism: 1 }
/** Lowest Argon2id settings a stored bundle may ask for (guards a tampered bundle). */
const ARGON_FLOOR = { memoryKiB: 19 * 1024, iterations: 2 }
const ARGON_CEIL = { memoryKiB: 1024 * 1024, iterations: 20 }
const MIN_PASSPHRASE = 12
const enc = new TextEncoder()
const dec = new TextDecoder()
const subtle = () => globalThis.crypto.subtle

/** The data could not be opened: wrong key, wrong code, or it was changed. */
export class SyncCryptoError extends Error {}

export function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n)
  globalThis.crypto.getRandomValues(out)
  return out
}

/** The unlocked master key: its id plus a non-extractable AES-GCM key. */
export interface MasterKey {
  keyId: string
  key: CryptoKey
  /** Raw bytes, kept only while new bundles are being made; then dropped. */
  raw?: Uint8Array
}

/** A locked copy of the master key (safe to store on the server or Drive). */
export interface KeyBundle {
  v: 1
  keyId: string
  method: 'passphrase' | 'recovery'
  /** Base64 salt. */
  salt: string
  /** Argon2id settings (passphrase only). */
  argon?: { memoryKiB: number; iterations: number; parallelism: number }
  iv: string
  /** Base64 locked key bytes (with the GCM check value). */
  ct: string
  createdAt: number
}

async function importAes(raw: Uint8Array, extractable = false) {
  return subtle().importKey(
    'raw',
    raw as BufferSource,
    { name: 'AES-GCM' },
    extractable,
    ['encrypt', 'decrypt'],
  )
}

/** Makes a fresh master key (first device only). */
export async function createMasterKey(): Promise<MasterKey> {
  const raw = randomBytes(32)
  const keyId = toHex(randomBytes(8))
  return { keyId, key: await importAes(raw), raw }
}

/** Opens a master key from its raw bytes (after unlocking a bundle). */
async function masterFromRaw(
  keyId: string,
  raw: Uint8Array,
): Promise<MasterKey> {
  return { keyId, key: await importAes(raw), raw }
}

/** Passphrase → 32-byte locking key (Argon2id, in WebAssembly). */
export async function passphraseKey(
  passphrase: string,
  salt: Uint8Array,
  argon = ARGON,
): Promise<Uint8Array> {
  return argon2id({
    password: passphrase.normalize('NFKC'),
    salt,
    parallelism: argon.parallelism,
    iterations: argon.iterations,
    memorySize: argon.memoryKiB,
    hashLength: 32,
    outputType: 'binary',
  })
}

/** Recovery code bytes → 32-byte locking key (HKDF-SHA-256; the code is already random). */
async function recoveryKey(code: Uint8Array, salt: Uint8Array) {
  const base = await subtle().importKey(
    'raw',
    code as BufferSource,
    'HKDF',
    false,
    ['deriveBits'],
  )
  const bits = await subtle().deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt as BufferSource,
      info: enc.encode('ln-recovery-v1'),
    },
    base,
    256,
  )
  return new Uint8Array(bits)
}

async function seal(key: Uint8Array, plain: Uint8Array, aad: string) {
  const iv = randomBytes(12)
  const k = await importAes(key)
  const ct = await subtle().encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      additionalData: enc.encode(aad),
    },
    k,
    plain as BufferSource,
  )
  return { iv, ct: new Uint8Array(ct) }
}

async function open(
  key: CryptoKey | Uint8Array,
  iv: Uint8Array,
  ct: Uint8Array,
  aad: string,
): Promise<Uint8Array> {
  try {
    const k = key instanceof Uint8Array ? await importAes(key) : key
    const plain = await subtle().decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
        additionalData: enc.encode(aad),
      },
      k,
      ct as BufferSource,
    )
    return new Uint8Array(plain)
  } catch {
    throw new SyncCryptoError('Could not open the locked data.')
  }
}

const bundleAad = (b: Pick<KeyBundle, 'keyId' | 'method'>) =>
  `ln-key|v1|${b.keyId}|${b.method}`

/** Locks the master key with a passphrase. */
export async function bundleWithPassphrase(
  master: MasterKey,
  passphrase: string,
  argon = ARGON,
): Promise<KeyBundle> {
  if (!master.raw) throw new SyncCryptoError('The key bytes are not open.')
  if (passphrase.normalize('NFKC').length < MIN_PASSPHRASE)
    throw new SyncCryptoError('The passphrase is too short.')
  const salt = randomBytes(16)
  const kek = await passphraseKey(passphrase, salt, argon)
  const base = { keyId: master.keyId, method: 'passphrase' as const }
  const { iv, ct } = await seal(kek, master.raw, bundleAad(base))
  return {
    v: 1,
    ...base,
    salt: toBase64(salt),
    argon,
    iv: toBase64(iv),
    ct: toBase64(ct),
    createdAt: Date.now(),
  }
}

/** Locks the master key with a recovery code (see `newRecoveryCode`). */
export async function bundleWithRecovery(
  master: MasterKey,
  code: string,
): Promise<KeyBundle> {
  if (!master.raw) throw new SyncCryptoError('The key bytes are not open.')
  const salt = randomBytes(16)
  const kek = await recoveryKey(parseRecoveryCode(code), salt)
  const base = { keyId: master.keyId, method: 'recovery' as const }
  const { iv, ct } = await seal(kek, master.raw, bundleAad(base))
  return {
    v: 1,
    ...base,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ct: toBase64(ct),
    createdAt: Date.now(),
  }
}

/** Checks a bundle read from the server or Drive before using it. */
export function isKeyBundle(x: unknown): x is KeyBundle {
  if (!x || typeof x !== 'object') return false
  const b = x as Partial<KeyBundle>
  if (
    b.v !== 1 ||
    typeof b.keyId !== 'string' ||
    !/^[0-9a-f]{16}$/.test(b.keyId)
  )
    return false
  if (b.method !== 'passphrase' && b.method !== 'recovery') return false
  if (typeof b.salt !== 'string' || typeof b.iv !== 'string') return false
  if (typeof b.ct !== 'string' || typeof b.createdAt !== 'number') return false
  if (b.method === 'passphrase') {
    const a = b.argon
    if (!a || a.parallelism !== 1) return false
    if (
      a.memoryKiB < ARGON_FLOOR.memoryKiB ||
      a.memoryKiB > ARGON_CEIL.memoryKiB
    )
      return false
    if (
      a.iterations < ARGON_FLOOR.iterations ||
      a.iterations > ARGON_CEIL.iterations
    )
      return false
  }
  return true
}

/** Opens a bundle with the passphrase or recovery code; throws if wrong. */
export async function unlockBundle(
  bundle: KeyBundle,
  secret: string,
): Promise<MasterKey> {
  if (!isKeyBundle(bundle)) throw new SyncCryptoError('Bad key bundle.')
  const salt = fromBase64(bundle.salt)
  const kek =
    bundle.method === 'passphrase'
      ? await passphraseKey(secret, salt, bundle.argon)
      : await recoveryKey(parseRecoveryCode(secret), salt)
  const raw = await open(
    kek,
    fromBase64(bundle.iv),
    fromBase64(bundle.ct),
    bundleAad(bundle),
  )
  if (raw.length !== 32) throw new SyncCryptoError('Bad key length.')
  return masterFromRaw(bundle.keyId, raw)
}

// ---- Recovery code: 26 Crockford base-32 letters = 130 bits, 128 random ----

const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** A new printed recovery code, e.g. "7K2Q-…" in groups of four. */
export function newRecoveryCode(): string {
  const bytes = randomBytes(16)
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out.match(/.{1,4}/g)!.join('-')
}

/** The 16 bytes of a typed code; spaces, dashes, case and O/I/L slips allowed. */
export function parseRecoveryCode(code: string): Uint8Array {
  const clean = code
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
  if (clean.length !== 26 || [...clean].some((c) => !B32.includes(c)))
    throw new SyncCryptoError('That recovery code is not complete.')
  const out = new Uint8Array(16)
  let bits = 0
  let value = 0
  let i = 0
  for (const c of clean) {
    value = ((value << 5) | B32.indexOf(c)) & 0xffff
    bits += 5
    if (bits >= 8 && i < 16) {
      out[i++] = (value >>> (bits - 8)) & 255
      bits -= 8
    }
  }
  return out
}

// ---- Records and files ----

/** What the server stores for one record: no readable content. */
export interface SealedRecord {
  keyId: string
  /** Base64 of IV (12 bytes) followed by the locked bytes. */
  data: string
}

/**
 * The id the server sees for a record: a hash of its table and id, so the
 * server cannot tell a block from a card (bug 10 in RESEARCH.md).
 */
export const remoteId = (table: string, id: string) =>
  stableId(`rec:${table}:${id}`)

const recordAad = (serverId: string, rev: number, keyId: string) =>
  `ln-rec|v1|${keyId}|${serverId}|${rev}`

/** Locks a record's JSON; its table and id travel inside. */
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

/**
 * Opens a record pulled as `serverId` at `rev`; throws if the key, id or
 * revision do not match (a swapped or replayed copy).
 */
export async function openRecord(
  master: MasterKey,
  serverId: string,
  rev: number,
  sealed: SealedRecord,
): Promise<{ table: string; id: string; value: unknown }> {
  if (sealed.keyId !== master.keyId)
    throw new SyncCryptoError('Locked with another key.')
  const bytes = fromBase64(sealed.data)
  const plain = await open(
    master.key,
    bytes.subarray(0, 12),
    bytes.subarray(12),
    recordAad(serverId, rev, master.keyId),
  )
  const parsed = JSON.parse(dec.decode(plain)) as {
    t: string
    i: string
    v: unknown
  }
  if (remoteId(parsed.t, parsed.i) !== serverId)
    throw new SyncCryptoError('Wrong record.')
  return { table: parsed.t, id: parsed.i, value: parsed.v }
}

/** Locks file bytes (pictures, books, audio) for Drive; `name` is bound in. */
export async function sealFile(
  master: MasterKey,
  name: string,
  bytes: Uint8Array,
): Promise<Uint8Array> {
  const iv = randomBytes(12)
  const ct = await subtle().encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      additionalData: enc.encode(`ln-file|v1|${master.keyId}|${name}`),
    },
    master.key,
    bytes as BufferSource,
  )
  return concat(iv, new Uint8Array(ct))
}

export async function openFile(
  master: MasterKey,
  name: string,
  sealed: Uint8Array,
): Promise<Uint8Array> {
  return open(
    master.key,
    sealed.subarray(0, 12),
    sealed.subarray(12),
    `ln-file|v1|${master.keyId}|${name}`,
  )
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length)
  out.set(a)
  out.set(b, a.length)
  return out
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Rough passphrase strength: length and variety (UNPROVEN thresholds). */
export function passphraseProblem(p: string): 'short' | 'simple' | null {
  const s = p.normalize('NFKC')
  if (s.length < MIN_PASSPHRASE) return 'short'
  const words = s.trim().split(/\s+/).length
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z\d\s]/].filter((r) =>
    r.test(s),
  ).length
  if (words < 3 && kinds < 3 && s.length < 20) return 'simple'
  if (new Set(s).size < 6) return 'simple'
  return null
}
