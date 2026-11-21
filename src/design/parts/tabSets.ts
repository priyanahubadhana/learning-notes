/**
 * Tab-set logic for the Tab row (SP-03): which tabs show, in which order,
 * custom tabs and renames. Pure functions plus a tiny injectable store, so it
 * is easy to test. The manager can swap the store for synced settings (D13).
 */
export const MAX_TABS = 24
export const CUSTOM_PREFIX = 'custom:'

export interface CustomTab {
  label: string
  /** What the tab points at (a saved filter, a shelf...). */
  source?: string
}

export interface TabSetData {
  /** Tab ids in order: catalog ids or `custom:<n>` ids. */
  ids: string[]
  custom: Record<string, CustomTab>
  /** Renamed catalog tabs. */
  labels: Record<string, string>
}

export interface TabSetStore {
  read(key: string): string | null
  write(key: string, value: string): void
  remove(key: string): void
}

const PREFIX = 'learning-notes:tabset.'

export const localTabSetStore: TabSetStore = {
  read: (k) => {
    try {
      return globalThis.localStorage?.getItem(PREFIX + k) ?? null
    } catch {
      return null
    }
  },
  write: (k, v) => {
    try {
      globalThis.localStorage?.setItem(PREFIX + k, v)
    } catch {
      /* storage blocked: the choice lasts until the page closes */
    }
  },
  remove: (k) => {
    try {
      globalThis.localStorage?.removeItem(PREFIX + k)
    } catch {
      /* ignore */
    }
  },
}

export function memoryTabSetStore(): TabSetStore {
  const m = new Map<string, string>()
  return {
    read: (k) => m.get(k) ?? null,
    write: (k, v) => void m.set(k, v),
    remove: (k) => void m.delete(k),
  }
}

export const defaultTabSet = (defaults: readonly string[]): TabSetData => ({
  ids: [...defaults],
  custom: {},
  labels: {},
})

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const cleanLabel = (s: unknown): string | null => {
  if (typeof s !== 'string') return null
  const v = s.replace(/\s+/g, ' ').trim().slice(0, 40)
  return v || null
}

/**
 * Makes any saved value safe: unknown ids dropped, duplicates dropped, bad
 * names dropped, capped at MAX_TABS. An empty result falls back to defaults.
 */
export function validateTabSet(
  raw: unknown,
  catalogIds: ReadonlySet<string>,
  defaults: readonly string[],
): TabSetData {
  if (!isRecord(raw)) return defaultTabSet(defaults)
  const custom: Record<string, CustomTab> = {}
  if (isRecord(raw.custom)) {
    for (const [id, v] of Object.entries(raw.custom)) {
      if (!id.startsWith(CUSTOM_PREFIX) || !isRecord(v)) continue
      const label = cleanLabel(v.label)
      if (!label) continue
      custom[id] = {
        label,
        ...(typeof v.source === 'string' ? { source: v.source } : {}),
      }
    }
  }
  const labels: Record<string, string> = {}
  if (isRecord(raw.labels)) {
    for (const [id, v] of Object.entries(raw.labels)) {
      const label = cleanLabel(v)
      if (catalogIds.has(id) && label) labels[id] = label
    }
  }
  const seen = new Set<string>()
  const ids: string[] = []
  if (Array.isArray(raw.ids)) {
    for (const id of raw.ids) {
      if (typeof id !== 'string' || seen.has(id)) continue
      if (!catalogIds.has(id) && !(id in custom)) continue
      seen.add(id)
      ids.push(id)
      if (ids.length >= MAX_TABS) break
    }
  }
  if (!ids.length) return defaultTabSet(defaults)
  const keptCustom: Record<string, CustomTab> = {}
  for (const id of ids) if (id in custom) keptCustom[id] = custom[id]
  return { ids, custom: keptCustom, labels }
}

export function loadTabSet(
  store: TabSetStore,
  setKey: string,
  catalogIds: ReadonlySet<string>,
  defaults: readonly string[],
): TabSetData {
  const text = store.read(setKey)
  if (!text) return defaultTabSet(defaults)
  try {
    return validateTabSet(JSON.parse(text), catalogIds, defaults)
  } catch {
    return defaultTabSet(defaults)
  }
}

export function saveTabSet(
  store: TabSetStore,
  setKey: string,
  data: TabSetData,
): void {
  store.write(setKey, JSON.stringify(data))
}

export function resetTabSet(
  store: TabSetStore,
  setKey: string,
  defaults: readonly string[],
): TabSetData {
  store.remove(setKey)
  return defaultTabSet(defaults)
}

export const canAdd = (d: TabSetData): boolean => d.ids.length < MAX_TABS

export function addTab(d: TabSetData, id: string): TabSetData {
  if (!canAdd(d) || d.ids.includes(id)) return d
  return { ...d, ids: [...d.ids, id] }
}

export function addCustomTab(
  d: TabSetData,
  label: string,
  source?: string,
): TabSetData {
  const name = cleanLabel(label)
  if (!name || !canAdd(d)) return d
  let n = 1
  while (`${CUSTOM_PREFIX}${n}` in d.custom) n++
  const id = `${CUSTOM_PREFIX}${n}`
  return {
    ...d,
    ids: [...d.ids, id],
    custom: {
      ...d.custom,
      [id]: { label: name, ...(source ? { source } : {}) },
    },
  }
}

export function removeTab(d: TabSetData, id: string): TabSetData {
  if (!d.ids.includes(id) || d.ids.length <= 1) return d
  const { [id]: _gone, ...custom } = d.custom
  void _gone
  return { ...d, ids: d.ids.filter((x) => x !== id), custom }
}

export function moveTab(d: TabSetData, from: number, to: number): TabSetData {
  if (from === to || from < 0 || to < 0) return d
  if (from >= d.ids.length || to >= d.ids.length) return d
  const ids = [...d.ids]
  const [x] = ids.splice(from, 1)
  ids.splice(to, 0, x)
  return { ...d, ids }
}

export function renameTab(
  d: TabSetData,
  id: string,
  label: string,
): TabSetData {
  const name = cleanLabel(label)
  if (!d.ids.includes(id)) return d
  if (id in d.custom) {
    if (!name) return d
    return {
      ...d,
      custom: { ...d.custom, [id]: { ...d.custom[id], label: name } },
    }
  }
  const labels = { ...d.labels }
  if (name) labels[id] = name
  else delete labels[id]
  return { ...d, labels }
}
