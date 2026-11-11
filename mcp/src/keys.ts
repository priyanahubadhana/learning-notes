import {
  isKeyBundle,
  masterFromRaw,
  unlockBundle,
  type KeyBundle,
  type MasterKey,
} from '../../src/sync/crypto'
import type { SecretStore } from './secrets'

/** Picks the passphrase bundle out of the server's key copies. */
export function passphraseBundle(jsons: string[]): KeyBundle | null {
  for (const j of jsons) {
    try {
      const b = JSON.parse(j) as unknown
      if (isKeyBundle(b) && b.method === 'passphrase') return b
    } catch {
      // Not a bundle: skip it.
    }
  }
  return null
}

const KEY = 'master'

/** Unlocks with the passphrase and keeps the key in the vault. */
export async function unlockAndStore(
  store: SecretStore,
  bundle: KeyBundle,
  passphrase: string,
): Promise<MasterKey> {
  const master = await unlockBundle(bundle, passphrase)
  await store.set(
    KEY,
    JSON.stringify({
      keyId: master.keyId,
      raw: Buffer.from(master.raw!).toString('base64'),
    }),
  )
  return master
}

/** The key saved by setup, or null. */
export async function loadMaster(
  store: SecretStore,
): Promise<MasterKey | null> {
  const raw = await store.get(KEY)
  if (!raw) return null
  const { keyId, raw: b64 } = JSON.parse(raw) as { keyId: string; raw: string }
  const m = await masterFromRaw(
    keyId,
    new Uint8Array(Buffer.from(b64, 'base64')),
  )
  // The server never needs the raw bytes: keep only the usable key.
  return { keyId: m.keyId, key: m.key }
}

export async function forgetAll(store: SecretStore): Promise<void> {
  await store.remove(KEY)
  await store.remove('refresh')
}
