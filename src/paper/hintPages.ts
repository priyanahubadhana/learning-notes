const KEY = 'ln.paperHintPages'
const MAX_PAGES = 3

/**
 * Does this page get the "tap to add a box" hint? Only the first few pages
 * a person opens on this device do; after that the hint stays away. Kept in
 * this browser only (nothing synced); without storage it shows every time.
 */
export function hintPageOk(pageId: string): boolean {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    const ids = Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === 'string')
      : []
    if (ids.includes(pageId)) return true
    if (ids.length >= MAX_PAGES) return false
    localStorage.setItem(KEY, JSON.stringify([...ids, pageId]))
    return true
  } catch {
    return true
  }
}
