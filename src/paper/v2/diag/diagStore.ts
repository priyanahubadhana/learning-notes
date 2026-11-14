/**
 * A small log kept on the device (last 300 entries) for the hidden recorders
 * (2B.2). Only kinds, times and numbers go in; never note text.
 */
export const KEEP = 300

/** The panel shows only with ?boxlog=1; the recording itself is quiet. */
export const diagPanelShown = (search: string): boolean => {
  try {
    return new URLSearchParams(search).get('boxlog') === '1'
  } catch {
    return false
  }
}

export type Storage2 = Pick<Storage, 'getItem' | 'setItem'>

/** Newest first, at most KEEP. */
export function capped<T>(rows: T[], keep = KEEP): T[] {
  return rows.length > keep ? rows.slice(0, keep) : rows
}

export function loadRows<T>(store: Storage2 | undefined, key: string): T[] {
  try {
    const v: unknown = JSON.parse(store?.getItem(key) ?? '[]')
    return Array.isArray(v) ? capped(v as T[]) : []
  } catch {
    return []
  }
}

export function saveRows<T>(
  store: Storage2 | undefined,
  key: string,
  rows: T[],
): void {
  try {
    store?.setItem(key, JSON.stringify(capped(rows)))
  } catch {
    /* full or blocked: the log keeps working in memory */
  }
}

/** What the Copy button puts on the clipboard: one JSON line per entry, oldest first. */
export function copyText(sections: Record<string, unknown[]>): string {
  return Object.entries(sections)
    .map(([name, rows]) =>
      [
        `# ${name} (${rows.length})`,
        ...[...rows].reverse().map((r) => JSON.stringify(r)),
      ].join('\n'),
    )
    .join('\n')
}

/** Words of the hidden panel: a diagnostic tool, English on purpose (kept out of JSX). */
export const DIAG_LABELS = {
  title: 'Box and save log',
  copy: 'Copy',
  copied: 'Copied',
  clear: 'Clear',
  close: 'Close',
}

/**
 * Writes only after a change, and at most once per delay; nothing is
 * written while nothing changes.
 */
export function deferredSave(write: () => void, delayMs = 1000) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const flush = () => {
    if (timer === undefined) return
    clearTimeout(timer)
    timer = undefined
    write()
  }
  return {
    changed() {
      timer ??= setTimeout(flush, delayMs)
    },
    flush,
  }
}
