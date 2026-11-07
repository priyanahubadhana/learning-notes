import type { ProviderId } from './provider'

/**
 * The API keys live only in this browser's localStorage: never in the
 * database, so never in a backup or a sync; never in a log. Several keys per
 * provider, each with a name the user chose ("Claude main", "Gemini free").
 * Not encrypted at rest (a web page cannot do that without a passphrase),
 * which the settings screen says in plain words.
 */

const LIST = 'learning-notes:ai.keys'
const LEGACY = (p: ProviderId) => `learning-notes:ai.key.${p}`
const LEGACY_NAMES: Record<ProviderId, string> = {
  anthropic: 'Claude',
  openai: 'OpenAI',
  gemini: 'Gemini',
}

export interface AiKey {
  /** Not secret; notebooks point at it. */
  id: string
  provider: ProviderId
  name: string
  key: string
  /** Monthly cap in US dollars for this key; unset = the default cap. */
  capUsd?: number
}

function store(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

const isKey = (v: unknown): v is AiKey => {
  const k = v as AiKey
  return (
    !!k &&
    typeof k.id === 'string' &&
    typeof k.name === 'string' &&
    typeof k.key === 'string' &&
    (k.provider === 'anthropic' ||
      k.provider === 'openai' ||
      k.provider === 'gemini') &&
    (k.capUsd === undefined || (typeof k.capUsd === 'number' && k.capUsd >= 0))
  )
}

function save(list: AiKey[]): boolean {
  try {
    store()?.setItem(LIST, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

const newId = (): string =>
  `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

/** A key text is usable when it is 8 to 300 characters without spaces. */
export const keyUsable = (key: string): boolean => {
  const k = key.trim()
  return k.length >= 8 && k.length <= 300 && !/\s/.test(k)
}

/** All saved keys. A key saved by the one-key version is moved in once. */
export function listKeys(): AiKey[] {
  const s = store()
  if (!s) return []
  let list: AiKey[] = []
  try {
    const raw = s.getItem(LIST)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (Array.isArray(parsed)) list = parsed.filter(isKey)
  } catch {
    list = []
  }
  let moved = false
  for (const p of Object.keys(LEGACY_NAMES) as ProviderId[]) {
    try {
      const old = s.getItem(LEGACY(p))
      if (old === null) continue
      if (keyUsable(old)) {
        list.push({
          id: newId(),
          provider: p,
          name: LEGACY_NAMES[p],
          key: old.trim(),
        })
        moved = true
      }
      s.removeItem(LEGACY(p))
    } catch {
      // leave it
    }
  }
  if (moved) save(list)
  return list
}

export const getKeyById = (id: string): AiKey | undefined =>
  listKeys().find((k) => k.id === id)

const cleanName = (name: string): string => name.trim().slice(0, 40)

/** Adds a key. Returns it, or null when the key text or name is unusable. */
export function addKey(
  provider: ProviderId,
  name: string,
  key: string,
): AiKey | null {
  const n = cleanName(name)
  if (!keyUsable(key)) return null
  const list = listKeys()
  const made: AiKey = {
    id: newId(),
    provider,
    name: n || LEGACY_NAMES[provider],
    key: key.trim(),
  }
  return save([...list, made]) ? made : null
}

function change(id: string, fn: (k: AiKey) => AiKey | null): boolean {
  const list = listKeys()
  const at = list.findIndex((k) => k.id === id)
  if (at < 0) return false
  const next = fn(list[at])
  if (!next) return false
  list[at] = next
  return save(list)
}

export const renameKey = (id: string, name: string): boolean =>
  change(id, (k) => (cleanName(name) ? { ...k, name: cleanName(name) } : null))

/** Replaces the secret of a key, keeping its name and place. */
export const replaceKey = (id: string, key: string): boolean =>
  change(id, (k) => (keyUsable(key) ? { ...k, key: key.trim() } : null))

/** Sets (or clears, with undefined) the monthly cap of one key. */
export const setKeyCap = (id: string, capUsd: number | undefined): boolean =>
  change(id, (k) => {
    const { capUsd: _old, ...rest } = k
    void _old
    return capUsd === undefined ? rest : { ...rest, capUsd }
  })

export function deleteKey(id: string): void {
  save(listKeys().filter((k) => k.id !== id))
}

/** The secret of the first key of a provider ('' when none). */
export function getKey(provider: ProviderId): string {
  return listKeys().find((k) => k.provider === provider)?.key ?? ''
}

/** Adds a key named after its provider (the one-key way). */
export const setKey = (provider: ProviderId, key: string): boolean =>
  addKey(provider, '', key) !== null

/** "sk-…abcd": enough to recognise the key, not to use it. */
export function maskKey(key: string): string {
  if (key.length <= 8) return '••••'
  return `${key.slice(0, 3)}…${key.slice(-4)}`
}
