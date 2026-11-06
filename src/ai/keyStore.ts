import type { ProviderId } from './provider'

/**
 * The API key lives only in this browser's localStorage: never in the
 * database, so never in a backup or a future sync; never in a log. It is not
 * encrypted at rest (a web page cannot do that without a passphrase), which
 * the settings screen says in plain words.
 */

const KEY = (p: ProviderId) => `learning-notes:ai.key.${p}`

function store(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

export function getKey(provider: ProviderId): string {
  try {
    return store()?.getItem(KEY(provider)) ?? ''
  } catch {
    return ''
  }
}

/** Saves a key (trimmed; whitespace inside is refused). Returns false if unusable. */
export function setKey(provider: ProviderId, key: string): boolean {
  const k = key.trim()
  if (k.length < 8 || k.length > 300 || /\s/.test(k)) return false
  try {
    store()?.setItem(KEY(provider), k)
    return true
  } catch {
    return false
  }
}

export function forgetKey(provider: ProviderId): void {
  try {
    store()?.removeItem(KEY(provider))
  } catch {
    // nothing to forget
  }
}

/** "sk-…abcd": enough to recognise the key, not to use it. */
export function maskKey(key: string): string {
  if (key.length <= 8) return '••••'
  return `${key.slice(0, 3)}…${key.slice(-4)}`
}
