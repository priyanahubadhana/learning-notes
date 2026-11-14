/**
 * Which built files the offline copy (service worker) saves. precache.json
 * (the update screen's file list) and the worker's globPatterns both come
 * from here, so the list never names a file the copy does not save (P1.3:
 * those counted as "missing" on every update and the screen waited on them).
 */
export const PRECACHE_EXTENSIONS = [
  'js',
  'css',
  'html',
  'svg',
  'png',
  'wasm',
  'woff2',
] as const
/** Not saved: the 404 page, and the on-device text reader (loads on first use). */
export const PRECACHE_IGNORES = ['404.html', '**/tesseract-core*']
export const PRECACHE_MAX_BYTES = 4 * 1024 * 1024
export const PRECACHE_GLOB = `**/*.{${PRECACHE_EXTENSIONS.join(',')}}`

/** True when the offline copy saves this file (same rules as the worker). */
export function isPrecached(fileName: string, size: number): boolean {
  const ext = fileName.split('/').pop()?.split('.').pop() ?? ''
  if (!(PRECACHE_EXTENSIONS as readonly string[]).includes(ext)) return false
  if (fileName === '404.html' || /(^|\/)tesseract-core[^/]*$/.test(fileName))
    return false
  return size <= PRECACHE_MAX_BYTES
}
