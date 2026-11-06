/**
 * Files attached to a page (G2) are kept in the app's own storage (the
 * `bookFiles` table) and written into the page as a short reference,
 * "lnfile:<id>", never as a path or web address.
 */
export const FILE_SCHEME = 'lnfile:'

const REF =
  /^lnfile:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

/** The reference text for a stored file. */
export const fileRef = (id: string): string => `${FILE_SCHEME}${id}`

/** The file id in a reference, or null if the text is not one. */
export function parseFileRef(text: string): string | null {
  return REF.exec(text.trim())?.[1].toLowerCase() ?? null
}

/** Largest attached file (bytes): 50 MB. */
export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024

/** A safe, short type string for the stored row. */
export function attachmentMime(type: string): string {
  const clean = type.trim().toLowerCase()
  return /^[\w.+-]{1,60}\/[\w.+-]{1,100}$/.test(clean)
    ? clean
    : 'application/octet-stream'
}

/** "1.4 MB" style size for the file card. */
export function sizeText(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
