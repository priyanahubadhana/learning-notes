import type { Connectors } from './connectors'
import {
  SyncCryptoError,
  bundleWithPassphrase,
  bundleWithRecovery,
  createMasterKey,
  isKeyBundle,
  newRecoveryCode,
  unlockBundle,
  type KeyBundle,
  type MasterKey,
} from './crypto'

/**
 * Key setup (L5). The first device makes the master key and locks two
 * copies: with the passphrase and with a printed recovery code. Both go to
 * the record store (for new devices); the passphrase copy also goes to Drive
 * as the spare (a new file each time, the newest valid one is used).
 */

const SPARE_PREFIX = 'ln-key-'

/** Locked key copies on the server, then the Drive spares. */
export async function findBundles(conn: Connectors): Promise<KeyBundle[]> {
  const parse = (json: string) => {
    try {
      const b = JSON.parse(json) as unknown
      return isKeyBundle(b) ? [b] : []
    } catch {
      return []
    }
  }
  const server = (await conn.records.listKeyBundles()).flatMap(parse)
  if (server.length > 0) return server
  try {
    const spares = await conn.files.list(SPARE_PREFIX)
    for (const f of spares) {
      const found = parse(new TextDecoder().decode(await conn.files.get(f.id)))
      if (found.length > 0) return found
    }
  } catch {
    // No Drive pass: only the server copies count.
  }
  return []
}

export interface NewKey {
  master: MasterKey
  recoveryCode: string
  /** False if the Drive spare could not be written yet (needs a tap). */
  spareSaved: boolean
}

export async function createKey(
  conn: Connectors,
  passphrase: string,
  argon?: Parameters<typeof bundleWithPassphrase>[2],
): Promise<NewKey> {
  const master = await createMasterKey()
  const recoveryCode = newRecoveryCode()
  const pass = await bundleWithPassphrase(master, passphrase, argon)
  const rec = await bundleWithRecovery(master, recoveryCode)
  await conn.records.putKeyBundle(
    `${master.keyId}-p-${pass.createdAt}`,
    JSON.stringify(pass),
  )
  await conn.records.putKeyBundle(
    `${master.keyId}-r-${rec.createdAt}`,
    JSON.stringify(rec),
  )
  const spareSaved = await saveSpare(conn, pass)
  delete master.raw // the bytes are no longer needed
  return { master, recoveryCode, spareSaved }
}

/** Writes the Drive spare (the passphrase copy). False if Drive is not reachable. */
async function saveSpare(
  conn: Connectors,
  bundle: KeyBundle,
): Promise<boolean> {
  try {
    await conn.files.put(
      `${SPARE_PREFIX}${bundle.keyId}-${bundle.createdAt}.json`,
      new TextEncoder().encode(JSON.stringify(bundle)),
    )
    return true
  } catch {
    return false
  }
}

/** True if the typed text looks like a recovery code rather than a passphrase. */
const looksLikeCode = (s: string) =>
  /^[0-9A-Za-z]{4}(-?[0-9A-Za-z]{4}){5}-?[0-9A-Za-z]{2}$/.test(
    s.trim().replace(/\s+/g, '-'),
  )

/**
 * Opens the key with the passphrase or the recovery code. The raw bytes are
 * dropped, except for `keepRaw` (the Claude opt-in, which must hand the key
 * to the server once; the caller wipes it right after).
 */
export async function unlockKey(
  conn: Connectors,
  secret: string,
  opts: { keepRaw?: boolean } = {},
): Promise<MasterKey> {
  const bundles = await findBundles(conn)
  if (bundles.length === 0) throw new SyncCryptoError('No key found.')
  const method = looksLikeCode(secret) ? 'recovery' : 'passphrase'
  const tries = bundles
    .filter((b) => b.method === method)
    .sort((a, b) => b.createdAt - a.createdAt)
  for (const b of tries) {
    try {
      const master = await unlockBundle(b, secret)
      if (!opts.keepRaw) delete master.raw
      return master
    } catch {
      // Try an older copy.
    }
  }
  throw new SyncCryptoError('wrong')
}

export interface NewCode {
  recoveryCode: string
  /** False if an old code copy could not be removed (it may still work). */
  oldRemoved: boolean
}

/**
 * "Make a new recovery code". Re-checks the passphrase, locks the SAME
 * master key with a fresh code, stores that new copy on the server FIRST and
 * checks it is there, and only then removes the old code copies. Nothing is
 * re-encrypted. If anything fails before the new copy is stored, the old code
 * still works; if a removal fails, both codes work and `oldRemoved` is false.
 * Throws SyncCryptoError('wrong') for a wrong passphrase.
 */
export async function replaceRecoveryCode(
  conn: Connectors,
  passphrase: string,
  keyId?: string,
): Promise<NewCode> {
  const all = (await findBundles(conn)).filter(
    (b) => !keyId || b.keyId === keyId,
  )
  let master: MasterKey | null = null
  for (const b of all
    .filter((x) => x.method === 'passphrase')
    .sort((a, c) => c.createdAt - a.createdAt)) {
    try {
      master = await unlockBundle(b, passphrase)
      break
    } catch {
      // Try an older copy.
    }
  }
  if (!master) throw new SyncCryptoError('wrong')
  const recoveryCode = newRecoveryCode()
  const rec = await bundleWithRecovery(master, recoveryCode)
  // The new copy must open with the new code before it is stored.
  await unlockBundle(rec, recoveryCode)
  delete master.raw
  const bundleId = (b: KeyBundle) => `${b.keyId}-r-${b.createdAt}`
  const old = all.filter((b) => b.method === 'recovery')
  const newId = bundleId(rec)
  await conn.records.putKeyBundle(newId, JSON.stringify(rec)) // first
  const stored = (await conn.records.listKeyBundles()).some((j) => {
    try {
      const b = JSON.parse(j) as unknown
      return isKeyBundle(b) && bundleId(b) === newId
    } catch {
      return false
    }
  })
  if (!stored) throw new SyncCryptoError('The new code was not stored.')
  let oldRemoved = true
  for (const b of old) {
    if (bundleId(b) === newId) continue
    try {
      await conn.records.deleteKeyBundle(bundleId(b))
    } catch {
      oldRemoved = false
    }
  }
  return { recoveryCode, oldRemoved }
}
