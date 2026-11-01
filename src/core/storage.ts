/** Whether the browser has promised to keep this app's data. */
export async function isStorageProtected(
  storage: StorageManager | undefined = globalThis.navigator?.storage,
): Promise<boolean> {
  try {
    return (await storage?.persisted?.()) ?? false
  } catch {
    return false
  }
}

/**
 * Asks the browser to keep this app's data permanently. Without this, some
 * browsers (notably Safari on iPhone/iPad) may delete stored notes after a
 * period of not using the site. Never throws; returns whether data is kept.
 */
export async function requestPersistentStorage(
  storage: StorageManager | undefined = globalThis.navigator?.storage,
): Promise<boolean> {
  try {
    if (!storage?.persist) return false
    if (await storage.persisted()) return true
    return await storage.persist()
  } catch {
    // Unsupported or blocked (e.g. private browsing): the app still works.
    return false
  }
}
