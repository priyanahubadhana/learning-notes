import type { MasterKey } from './crypto'

/**
 * Keeps the unlocked master key on this device (L5) so the passphrase is
 * asked once per device, not on every start. The key is stored as a
 * non-extractable CryptoKey in its own small browser database, separate from
 * the notes database: never in a backup, never synced, and its bytes cannot
 * be read back by any script (it can only be used while the app runs).
 */

const NAME = 'learning-notes-keys'
const STORE = 'keys'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result as T)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

let memo: MasterKey | null = null

export async function saveMasterKey(master: MasterKey): Promise<void> {
  memo = { keyId: master.keyId, key: master.key }
  await run('readwrite', (s) =>
    s.put({ keyId: master.keyId, key: master.key }, 'master'),
  )
}

export async function loadMasterKey(): Promise<MasterKey | null> {
  if (memo) return memo
  try {
    const row = await run<{ keyId: string; key: CryptoKey } | undefined>(
      'readonly',
      (s) => s.get('master'),
    )
    memo = row ? { keyId: row.keyId, key: row.key } : null
  } catch {
    memo = null
  }
  return memo
}

/** Forgets the key on this device (sign out › "Forget this device's key"). */
export async function forgetMasterKey(): Promise<void> {
  memo = null
  await run('readwrite', (s) => s.delete('master'))
}
